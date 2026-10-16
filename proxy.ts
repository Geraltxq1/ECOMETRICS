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
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isAdminPage = pathname.startsWith('/admin')
  const metadata = claims?.user_metadata as { role?: string } | undefined
  const isAdminGlobal = metadata?.role === 'adminglobal'

  if (!claims?.sub && !isAuthPage) return NextResponse.redirect(new URL('/login', request.url))
  if (claims?.sub && isAuthPage) return NextResponse.redirect(new URL(isAdminGlobal ? '/admin/dashboard' : '/dashboard', request.url))
  if (isAdminPage && !isAdminGlobal) return NextResponse.redirect(new URL('/dashboard', request.url))
  if (claims?.sub && isAdminGlobal && !isAdminPage && !isAuthPage) return NextResponse.redirect(new URL('/admin/dashboard', request.url))

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
