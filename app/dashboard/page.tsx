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

  // Fallback para usuarios legacy (sin perfil): buscar empresa propia
  if (!perfil) {
    const { data: empresa } = await admin
      .from('empresas')
      .select('id, nombre')
      .eq('user_id', user.id)
      .maybeSingle()

    if (empresa) {
      const { data: inserted } = await admin
        .from('perfiles')
        .upsert({
          user_id:    user.id,
          empresa_id: empresa.id,
          nombre:     (user.user_metadata as { nombre?: string })?.nombre ?? user.email,
          email:      user.email,
          rol:        'admin',
          activo:     true,
        }, { onConflict: 'user_id' })
        .select()
        .maybeSingle()
      perfil = inserted
    }
  }

  const empresaId = perfil?.empresa_id ?? null

  // Obtener empresa
  const empresa = empresaId
    ? (await admin.from('empresas').select('id, nombre, ciudad, industria').eq('id', empresaId).maybeSingle()).data
    : null

  // Stats
  const [registrosRes, sedesRes, indicadoresRes] = await Promise.all([
    admin.from('registros_datos').select('co2_calculado').eq('empresa_id', empresaId ?? ''),
    admin.from('sedes').select('id', { count: 'exact' }).eq('empresa_id', empresaId ?? ''),
    admin.from('registros_datos').select('indicador_id').eq('empresa_id', empresaId ?? ''),
  ])

  const totalCO2        = (registrosRes.data ?? []).reduce((s: number, r: { co2_calculado: number | null }) => s + (r.co2_calculado ?? 0), 0)
  const totalRegistros  = registrosRes.data?.length ?? 0
  const totalSedes      = sedesRes.count ?? 0
  const indicadoresUsados = new Set((indicadoresRes.data ?? []).map((r: { indicador_id: string }) => r.indicador_id)).size

  // Emisiones por mes (año actual)
  const anioActual = new Date().getFullYear()
  const { data: emisionesMes } = await admin
    .from('registros_datos')
    .select('mes, co2_calculado')
    .eq('empresa_id', empresaId ?? '')
    .eq('anio', anioActual)

  const porMes = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    co2: (emisionesMes ?? [])
      .filter((r: { mes: number | null }) => r.mes === i + 1)
      .reduce((s: number, r: { co2_calculado: number | null }) => s + (r.co2_calculado ?? 0), 0),
  }))

  // Últimos 5 registros
  const { data: ultimos } = await admin
    .from('registros_datos')
    .select('id, valor, co2_calculado, mes, anio, estado, created_at, indicadores(codigo, nombre, unidad), sedes(nombre)')
    .eq('empresa_id', empresaId ?? '')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <DashboardClient
      userEmail={user.email}
      userName={perfil?.nombre ?? ''}
      rol={perfil?.rol ?? 'viewer'}
      empresa={empresa as { id: string; nombre: string; ciudad: string | null; industria: string | null } | null}
      stats={{ totalRegistros, totalCO2, totalSedes, indicadoresUsados }}
      porMes={porMes}
      ultimos={(ultimos ?? []) as never[]}
    />
  )
}
