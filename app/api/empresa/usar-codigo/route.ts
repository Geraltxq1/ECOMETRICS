import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { validateUsarCodigo } from '@/lib/validation'

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const validation = validateUsarCodigo(body)
  if (validation.error || !validation.data) {
    return NextResponse.json({ error: validation.error ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { userId, codigo, nombre, email } = validation.data
  const admin = createAdminClient()

  // [13] Supabase SDK usa queries parametrizadas
  const { data: inv, error: invErr } = await admin
    .from('codigos_invitacion')
    .select('id, empresa_id, rol_asignado, usado, expira_en')
    .eq('codigo', codigo)
    .single()

  if (invErr || !inv) return NextResponse.json({ error: 'Código de invitación no encontrado.' }, { status: 404 })
  if (inv.usado) return NextResponse.json({ error: 'Este código ya fue utilizado.' }, { status: 409 })
  if (new Date(inv.expira_en) < new Date()) return NextResponse.json({ error: 'El código de invitación ha expirado.' }, { status: 410 })

  const { data: perfilExistente } = await admin
    .from('perfiles').select('id').eq('user_id', userId).eq('empresa_id', inv.empresa_id).maybeSingle()
  if (perfilExistente) return NextResponse.json({ error: 'Ya eres miembro de esta empresa.' }, { status: 409 })

  const { error: perfilErr } = await admin.from('perfiles').insert({
    user_id: userId, empresa_id: inv.empresa_id, nombre: nombre ?? null,
    email, rol: inv.rol_asignado ?? 'editor', activo: true,
  })
  if (perfilErr) return NextResponse.json({ error: 'Error al vincular la cuenta a la empresa.' }, { status: 500 })

  await admin.from('codigos_invitacion').update({ usado: true, usado_por: userId }).eq('id', inv.id)

  return NextResponse.json({ ok: true, empresa_id: inv.empresa_id, rol: inv.rol_asignado })
}
