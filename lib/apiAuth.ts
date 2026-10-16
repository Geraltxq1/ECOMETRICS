import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Usuario autenticado según las cookies de la request (o null). */
export async function getAuthUser() {
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
  return user
}

export interface PerfilAdmin {
  id: string
  empresa_id: string
  rol: string
}

/**
 * Carga el perfil del usuario con el cliente admin (bypass RLS) y verifica
 * que sea rol "admin" de una empresa. Devuelve null si no cumple.
 */
export async function getAdminPerfil(admin: SupabaseClient, userId: string): Promise<PerfilAdmin | null> {
  const { data } = await admin
    .from('perfiles')
    .select('id, empresa_id, rol')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data || data.rol !== 'admin' || !data.empresa_id) return null
  return data as PerfilAdmin
}
