import { createAdminClient } from '@/lib/supabaseAdmin'
import { getAuthUser, getAdminPerfil } from '@/lib/apiAuth'
import { NextResponse } from 'next/server'

/** GET /api/empresa/codigos — lista todos los códigos de invitación de la empresa del admin. */
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const solicitante = await getAdminPerfil(admin, user.id)

  if (!solicitante) {
    return NextResponse.json({ error: 'No tienes permisos para ver los códigos de invitación.' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('codigos_invitacion')
    .select('id, codigo, rol_asignado, usado, usado_por, expira_en, created_at')
    .eq('empresa_id', solicitante.empresa_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar los códigos de invitación.' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
