import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const { email, empresa_id } = body as { email?: string; empresa_id?: string }

  if (!email || !empresa_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar que el usuario es propietario de la empresa
  const { data: membresia } = await admin
    .from('miembros_empresa')
    .select('rol')
    .eq('empresa_id', empresa_id)
    .eq('user_id', user.id)
    .eq('rol', 'owner')
    .maybeSingle()

  if (!membresia) {
    return NextResponse.json({ error: 'No tienes permisos para invitar a esta empresa' }, { status: 403 })
  }

  // Verificar que el invitado no sea el mismo propietario
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'No puedes invitarte a ti mismo' }, { status: 400 })
  }

  // Crear la invitación (upsert por si ya existía pendiente)
  const { data: miembro, error } = await admin
    .from('miembros_empresa')
    .upsert(
      {
        empresa_id,
        email: email.toLowerCase(),
        rol: 'colaborador',
        estado: 'pendiente',
        invitado_por: user.id,
        user_id: null,
      },
      { onConflict: 'empresa_id,email' }
    )
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Este correo ya fue invitado o ya es miembro de la empresa' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear la invitación' }, { status: 500 })
  }

  return NextResponse.json({ miembro }, { status: 201 })
}
