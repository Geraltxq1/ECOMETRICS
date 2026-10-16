import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// ──────────────────────────────────────────────
// [11] Rate limiting en memoria (por IP)
// ──────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/admin/register':      { max: 5,  windowMs: 60_000 },
  '/api/empresa/usar-codigo': { max: 10, windowMs: 60_000 },
  '/api/empresa/generar-codigo': { max: 20, windowMs: 60_000 },
  '/api/empresa/invitar':     { max: 20, windowMs: 60_000 },
}
const GLOBAL_API_LIMIT = { max: 100, windowMs: 60_000 }

function getRealIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
  }
  entry.count++
  const remaining = Math.max(0, max - entry.count)
  return { allowed: entry.count <= max, remaining, resetAt: entry.resetAt }
}

// ──────────────────────────────────────────────
// [12] Detección básica de bots
// ──────────────────────────────────────────────
const BOT_PATTERNS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zgrab/i,
  /python-requests/i, /scrapy/i, /go-http-client/i, /libwww/i,
]

function isBotRequest(req: NextRequest): boolean {
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua) return true
  return BOT_PATTERNS.some((p) => p.test(ua))
}

// ──────────────────────────────────────────────
// [6] Rutas protegidas que requieren autenticación
// ──────────────────────────────────────────────
const PROTECTED_PATHS = [
  '/dashboard', '/registros', '/indicadores', '/reportes',
  '/empresas', '/sedes', '/configuracion', '/perfil',
  '/notificaciones', '/onboarding', '/revision', '/admin/dashboard',
]
const AUTH_PATHS = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ip = getRealIp(req)

  // [12] Bloquear bots en rutas de API
  if (pathname.startsWith('/api/') && isBotRequest(req)) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  // [11] Rate limiting en rutas de API
  if (pathname.startsWith('/api/')) {
    const routeLimit = RATE_LIMITS[pathname]
    if (routeLimit) {
      const key = `${ip}:${pathname}`
      const { allowed, remaining, resetAt } = checkRateLimit(key, routeLimit)
      if (!allowed) {
        return NextResponse.json(
          { error: 'Demasiadas solicitudes. Intenta más tarde.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }
    }
    const globalKey = `${ip}:global-api`
    const { allowed: globalAllowed } = checkRateLimit(globalKey, GLOBAL_API_LIMIT)
    if (!globalAllowed) {
      return NextResponse.json(
        { error: 'Límite de solicitudes alcanzado.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  // [6] Forzar autenticación en rutas protegidas
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p))

  if (!isProtected && !isAuthPath) return NextResponse.next()

  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (isProtected && !user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
