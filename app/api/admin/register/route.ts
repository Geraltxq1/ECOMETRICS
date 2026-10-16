import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { validateAdminRegister } from '@/lib/validation'

export async function POST(request: Request) {
  // [14] Validar y [15] sanitizar input
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const validation = validateAdminRegister(body)
  if (validation.error || !validation.data) {
    return NextResponse.json({ error: validation.error ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { email, password, code } = validation.data

  // [13] Comparación segura del código
  const expectedCode = process.env.ADMIN_INVITE_CODE ?? ''
  if (code.length !== expectedCode.length || code !== expectedCode) {
    return NextResponse.json({ error: 'Código de administrador incorrecto.' }, { status: 403 })
  }

  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminSupabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'adminglobal' } },
  })

  if (error?.message?.toLowerCase().includes('already registered') || error?.message?.toLowerCase().includes('already been registered')) {
    const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers()
    if (listError) return NextResponse.json({ error: 'Error al buscar el usuario.' }, { status: 500 })
    const existing = listData.users.find(u => u.email === email)
    if (!existing) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(existing.id, {
      user_metadata: { ...existing.user_metadata, role: 'adminglobal' },
      email_confirm: true,
    })
    if (updateError) return NextResponse.json({ error: 'Error al actualizar permisos: ' + updateError.message }, { status: 500 })
    return NextResponse.json({ message: 'Permisos de administrador asignados. Ya puedes iniciar sesión.' })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (data.user) {
    const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(data.user.id, { email_confirm: true })
    if (confirmError) console.error('Error confirming user:', confirmError)
  }

  return NextResponse.json({ message: 'Admin registrado exitosamente. Ya puedes iniciar sesión.', data })
}
