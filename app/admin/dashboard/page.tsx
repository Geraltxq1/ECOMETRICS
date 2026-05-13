import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboardPage() {
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
  const role = (user?.user_metadata as { role?: string })?.role

  if (!user || role !== 'admin') {
    return redirect('/admin')
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: usersData }, { data: empresas }] = await Promise.all([
    adminSupabase.auth.admin.listUsers(),
    adminSupabase.from('empresas').select('*').order('created_at', { ascending: false }),
  ])

  const users = (usersData?.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    user_metadata: (u.user_metadata ?? {}) as { role?: string; nombre_empresa?: string },
  }))

  return (
    <AdminDashboardClient
      currentUser={{ id: user.id, email: user.email ?? '' }}
      users={users}
      empresas={(empresas ?? []) as { id: string; nombre: string; user_id: string; created_at: string }[]}
    />
  )
}
