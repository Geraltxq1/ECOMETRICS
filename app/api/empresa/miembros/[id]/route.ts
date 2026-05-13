import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const admin = createAdminClient()

  // Obtener el miembro a eliminar
  const { data: objetivo, error: fetchError } = await admin
    .from('miembros_empresa')
    .select('empresa_id, rol, user_id')
    .eq('id', id)
    .single()

  if (fetchError || !objetivo) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  // Verificar que quien solicita es propietario de esa empresa
  const { data: solicitante } = await admin
    .from('miembros_empresa')
    .select('rol')
    .eq('empresa_id', objetivo.empresa_id)
    .eq('user_id', user.id)
    .eq('rol', 'owner')
    .maybeSingle()

  if (!solicitante) {
    return NextResponse.json({ error: 'No tienes permisos para eliminar miembros' }, { status: 403 })
  }

  // Evitar que el propietario se elimine a sí mismo
  if (objetivo.user_id === user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo como propietario' }, { status: 400 })
  }

  const { error } = await admin
    .from('miembros_empresa')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Error al eliminar el miembro' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
