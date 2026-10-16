import { createAdminClient } from '@/lib/supabaseAdmin'
import { getAuthUser, getAdminPerfil } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'

/** GET /api/empresa/miembros — lista todos los miembros (perfiles) de la empresa del admin. */
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const solicitante = await getAdminPerfil(admin, user.id)

  if (!solicitante) {
    return NextResponse.json({ error: 'No tienes permisos para ver el equipo.' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('perfiles')
    .select('id, user_id, nombre, email, rol, activo, created_at')
    .eq('empresa_id', solicitante.empresa_id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar el equipo.' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
