import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, codigo, nombre, email } = body as {
    userId?: string
    codigo?: string
    nombre?: string
    email?: string
  }

  if (!userId || !codigo || !email) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Validar el código (no usado, no expirado)
  const { data: inv, error: invErr } = await admin
    .from('codigos_invitacion')
    .select('id, empresa_id, rol_asignado, usado, expira_en')
    .eq('codigo', codigo.trim().toUpperCase())
    .single()

  if (invErr || !inv) {
    return NextResponse.json({ error: 'Código de invitación no encontrado.' }, { status: 404 })
  }
  if (inv.usado) {
    return NextResponse.json({ error: 'Este código ya fue utilizado.' }, { status: 409 })
  }
  if (new Date(inv.expira_en) < new Date()) {
    return NextResponse.json({ error: 'El código de invitación ha expirado.' }, { status: 410 })
  }

  // 2. Verificar que el usuario no tenga ya un perfil en esta empresa
  const { data: perfilExistente } = await admin
    .from('perfiles')
    .select('id')
    .eq('user_id', userId)
    .eq('empresa_id', inv.empresa_id)
    .maybeSingle()

  if (perfilExistente) {
    return NextResponse.json({ error: 'Ya eres miembro de esta empresa.' }, { status: 409 })
  }

  // 3. Crear perfil vinculado a la empresa
  const { error: perfilErr } = await admin.from('perfiles').insert({
    user_id:    userId,
    empresa_id: inv.empresa_id,
    nombre:     nombre ?? null,
    email,
    rol:        inv.rol_asignado ?? 'editor',
    activo:     true,
  })

  if (perfilErr) {
    return NextResponse.json({ error: 'Error al vincular la cuenta a la empresa.' }, { status: 500 })
  }

  // 4. Marcar código como usado (service role — sin RLS)
  await admin
    .from('codigos_invitacion')
    .update({ usado: true, usado_por: userId })
    .eq('id', inv.id)

  return NextResponse.json({ ok: true, empresa_id: inv.empresa_id, rol: inv.rol_asignado })
}
