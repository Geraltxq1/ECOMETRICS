import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generarCodigo(): string {
  const rand = Array.from({ length: 4 }, () => CHARS[randomInt(0, CHARS.length)]).join('')
  return `ECO-${new Date().getFullYear()}-${rand}`
}

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
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const body = await req.json()
  const { rolInv } = body as { rolInv?: string }
  const rol = rolInv ?? 'editor'

  const admin = createAdminClient()

  // Verificar que el usuario es admin de alguna empresa
  const { data: perfil } = await admin
    .from('perfiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .eq('rol', 'admin')
    .maybeSingle()

  if (!perfil) {
    return NextResponse.json({ error: 'No tienes permisos para generar códigos.' }, { status: 403 })
  }

  // Generar código único (reintentar en caso de colisión)
  let codigo = ''
  let intentos = 0
  while (intentos < 5) {
    const candidato = generarCodigo()
    const { data: existente } = await admin
      .from('codigos_invitacion')
      .select('id')
      .eq('codigo', candidato)
      .maybeSingle()

    if (!existente) { codigo = candidato; break }
    intentos++
  }

  if (!codigo) {
    return NextResponse.json({ error: 'No se pudo generar un código único. Intenta de nuevo.' }, { status: 500 })
  }

  const { data, error } = await admin
    .from('codigos_invitacion')
    .insert({
      empresa_id:   perfil.empresa_id,
      codigo,
      creado_por:   user.id,
      rol_asignado: rol,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al guardar el código.' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
