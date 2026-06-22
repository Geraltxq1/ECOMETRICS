import { redirect } from 'next/navigation'

// El login de admin ahora usa el mismo /login que los usuarios normales.
// El /login detecta user_metadata.role === 'admin' y redirige a /admin/dashboard.
export default function AdminLoginRedirect() {
  redirect('/login')
}
