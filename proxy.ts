import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isGlobalAdmin = (user?.user_metadata as { role?: string })?.role === 'adminglobal'
  const isAuthPage    = request.nextUrl.pathname.startsWith('/login') ||
                        request.nextUrl.pathname.startsWith('/register') ||
                        request.nextUrl.pathname === '/admin/register'
  const isAdminPage   = request.nextUrl.pathname.startsWith('/admin') &&
                        request.nextUrl.pathname !== '/admin/register'

  // Sin sesión → solo pueden estar en páginas de auth
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin global autenticado visitando auth pages → admin dashboard
  if (user && isGlobalAdmin && isAuthPage) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Admin global autenticado visitando dashboard normal → redirigir a su panel
  if (user && isGlobalAdmin && !isAdminPage) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Usuario normal autenticado en auth pages → su dashboard
  if (user && !isGlobalAdmin && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Usuario normal intentando acceder a rutas /admin → su dashboard
  if (user && !isGlobalAdmin && isAdminPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
