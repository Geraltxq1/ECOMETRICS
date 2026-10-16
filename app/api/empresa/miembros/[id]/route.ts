import { createAdminClient } from '@/lib/supabaseAdmin'
import { getAuthUser, getAdminPerfil } from '@/lib/apiAuth'
import { NextRequest, NextResponse } from 'next/server'

const ROLES_VALIDOS = ['admin', 'editor', 'viewer', 'auditor']

/**
 * PATCH /api/empresa/miembros/[id]
 * Body: { rol: string } para cambiar de rol, o { activo: boolean } para activar/desactivar.
 * Reglas: no auto-modificarse, no dejar la empresa sin administradores.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { rol, activo } = body as { rol?: string; activo?: boolean }

  if (rol === undefined && activo === undefined) {
    return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const solicitante = await getAdminPerfil(admin, user.id)
  if (!solicitante) {
    return NextResponse.json({ error: 'No tienes permisos para gestionar el equipo.' }, { status: 403 })
  }

  const { data: objetivo, error: fetchError } = await admin
    .from('perfiles')
    .select('id, user_id, empresa_id, rol, activo')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !objetivo || objetivo.empresa_id !== solicitante.empresa_id) {
    return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 })
  }

  const esUnoMismo = objetivo.user_id === user.id

  const contarAdmins = async (soloActivos: boolean) => {
    let query = admin
      .from('perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', solicitante.empresa_id)
      .eq('rol', 'admin')
    if (soloActivos) query = query.eq('activo', true)
    const { count } = await query
    return count ?? 0
  }

  const updates: Record<string, unknown> = {}

  if (rol !== undefined) {
    if (esUnoMismo) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol.' }, { status: 400 })
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
    }
    if (objetivo.rol === 'admin' && rol !== 'admin') {
      const totalAdmins = await contarAdmins(false)
      if (totalAdmins <= 1) {
        return NextResponse.json(
          { error: 'No puedes quitar el rol de administrador al último admin de la empresa.' },
          { status: 400 }
        )
      }
    }
    updates.rol = rol
  }

  if (activo !== undefined) {
    if (esUnoMismo) {
      return NextResponse.json({ error: 'No puedes desactivarte a ti mismo.' }, { status: 400 })
    }
    if (activo === false && objetivo.rol === 'admin') {
      const adminsActivos = await contarAdmins(true)
      if (adminsActivos <= 1) {
        return NextResponse.json(
          { error: 'No puedes desactivar al último administrador activo.' },
          { status: 400 }
        )
      }
    }
    updates.activo = activo
  }

  const { data, error } = await admin
    .from('perfiles')
    .update(updates)
    .eq('id', id)
    .select('id, user_id, nombre, email, rol, activo, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar el miembro.' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/**
 * DELETE /api/empresa/miembros/[id]
 * Elimina el perfil (pierde acceso a la plataforma; sus registros se conservan).
 * Reglas: no auto-eliminarse, no eliminar al último administrador.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const solicitante = await getAdminPerfil(admin, user.id)
  if (!solicitante) {
    return NextResponse.json({ error: 'No tienes permisos para eliminar miembros.' }, { status: 403 })
  }

  const { data: objetivo, error: fetchError } = await admin
    .from('perfiles')
    .select('id, user_id, empresa_id, rol')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !objetivo || objetivo.empresa_id !== solicitante.empresa_id) {
    return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 })
  }

  if (objetivo.user_id === user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo del proyecto.' }, { status: 400 })
  }

  if (objetivo.rol === 'admin') {
    const { count } = await admin
      .from('perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', solicitante.empresa_id)
      .eq('rol', 'admin')

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'No puedes eliminar al último administrador de la empresa.' },
        { status: 400 }
      )
    }
  }

  const { error } = await admin.from('perfiles').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Error al eliminar el miembro.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
