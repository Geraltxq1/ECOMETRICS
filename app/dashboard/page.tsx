import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabaseAdmin'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const admin = createAdminClient()

  // Obtener perfil
  let { data: perfil } = await admin
    .from('perfiles')
    .select('id, nombre, email, rol, empresa_id, activo')
    .eq('user_id', user.id)
    .maybeSingle()

  // Fallback para usuarios legacy
  if (!perfil) {
    const { data: empresa } = await admin.from('empresas').select('id, nombre').eq('user_id', user.id).maybeSingle()
    if (empresa) {
      const { data: inserted } = await admin.from('perfiles').upsert({
        user_id: user.id, empresa_id: empresa.id,
        nombre: (user.user_metadata as { nombre?: string })?.nombre ?? user.email,
        email: user.email, rol: 'admin', activo: true,
      }, { onConflict: 'user_id' }).select().maybeSingle()
      perfil = inserted
    }
  }

  const empresaId = perfil?.empresa_id ?? null

  const empresa = empresaId
    ? (await admin.from('empresas').select('id, nombre, ciudad, industria').eq('id', empresaId).maybeSingle()).data
    : null

  // Stats generales
  const [registrosRes, sedesRes, indicadoresRes] = await Promise.all([
    admin.from('registros_datos').select('co2_calculado').eq('empresa_id', empresaId ?? ''),
    admin.from('sedes').select('id', { count: 'exact' }).eq('empresa_id', empresaId ?? ''),
    admin.from('registros_datos').select('indicador_id').eq('empresa_id', empresaId ?? ''),
  ])

  const totalCO2       = (registrosRes.data ?? []).reduce((s: number, r: { co2_calculado: number | null }) => s + (r.co2_calculado ?? 0), 0)
  const totalRegistros = registrosRes.data?.length ?? 0
  const totalSedes     = sedesRes.count ?? 0
  const indicadoresUsados = new Set((indicadoresRes.data ?? []).map((r: { indicador_id: string }) => r.indicador_id)).size

  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth() + 1

  // Emisiones por mes (año actual)
  const { data: emisionesMes } = await admin.from('registros_datos')
    .select('mes, co2_calculado')
    .eq('empresa_id', empresaId ?? '').eq('anio', anioActual)

  const porMes = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    co2: (emisionesMes ?? [])
      .filter((r: { mes: number | null }) => r.mes === i + 1)
      .reduce((s: number, r: { co2_calculado: number | null }) => s + (r.co2_calculado ?? 0), 0),
  }))

  // Emisiones por categoría
  const { data: regsCategoria } = await admin.from('registros_datos')
    .select('co2_calculado, indicadores(categoria)')
    .eq('empresa_id', empresaId ?? '')
    .in('estado', ['aprobado', 'publicado'])

  const catMap: Record<string, number> = {}
  ;(regsCategoria ?? []).forEach((r: { co2_calculado: number | null; indicadores: unknown }) => {
    const ind = Array.isArray(r.indicadores) ? r.indicadores[0] : r.indicadores
    const cat = (ind as { categoria?: string } | null)?.categoria ?? 'otro'
    catMap[cat] = (catMap[cat] ?? 0) + (r.co2_calculado ?? 0)
  })
  const porCategoria = Object.entries(catMap).map(([categoria, co2]) => ({ categoria, co2 })).sort((a, b) => b.co2 - a.co2)

  // Emisiones por sede
  const { data: regsSede } = await admin.from('registros_datos')
    .select('co2_calculado, sedes(nombre)')
    .eq('empresa_id', empresaId ?? '')
    .in('estado', ['aprobado', 'publicado'])

  const sedeMap: Record<string, number> = {}
  ;(regsSede ?? []).forEach((r: { co2_calculado: number | null; sedes: unknown }) => {
    const s = Array.isArray(r.sedes) ? r.sedes[0] : r.sedes
    const nombre = (s as { nombre?: string } | null)?.nombre ?? 'Sin sede'
    sedeMap[nombre] = (sedeMap[nombre] ?? 0) + (r.co2_calculado ?? 0)
  })
  const porSede = Object.entries(sedeMap).map(([sede, co2]) => ({ sede, co2 })).sort((a, b) => b.co2 - a.co2).slice(0, 5)

  // Indicador más usado este mes
  const { data: regsEsteMes } = await admin.from('registros_datos')
    .select('indicador_id, indicadores(nombre)')
    .eq('empresa_id', empresaId ?? '').eq('anio', anioActual).eq('mes', mesActual)

  const indCount: Record<string, { nombre: string; count: number }> = {}
  ;(regsEsteMes ?? []).forEach((r: { indicador_id: string; indicadores: unknown }) => {
    const ind = Array.isArray(r.indicadores) ? r.indicadores[0] : r.indicadores
    const nombre = (ind as { nombre?: string } | null)?.nombre ?? r.indicador_id
    indCount[r.indicador_id] = { nombre, count: (indCount[r.indicador_id]?.count ?? 0) + 1 }
  })
  const indicadorMasUsado = Object.values(indCount).sort((a, b) => b.count - a.count)[0] ?? null

  // Últimos 5 registros
  const { data: ultimos } = await admin.from('registros_datos')
    .select('id, valor, co2_calculado, mes, anio, estado, created_at, indicadores(codigo, nombre, unidad), sedes(nombre)')
    .eq('empresa_id', empresaId ?? '')
    .order('created_at', { ascending: false }).limit(5)

  return (
    <DashboardClient
      userEmail={user.email}
      userName={perfil?.nombre ?? ''}
      rol={perfil?.rol ?? 'viewer'}
      empresa={empresa as { id: string; nombre: string; ciudad: string | null; industria: string | null } | null}
      stats={{ totalRegistros, totalCO2, totalSedes, indicadoresUsados }}
      porMes={porMes}
      porCategoria={porCategoria}
      porSede={porSede}
      indicadorMasUsado={indicadorMasUsado}
      ultimos={(ultimos ?? []) as never[]}
    />
  )
}
