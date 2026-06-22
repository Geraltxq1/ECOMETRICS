'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { canAdmin, canEdit } from '@/lib/permissions'
import { LogOutIcon } from './Icons'

const NAV_ALL = [
  { href: '/dashboard',       label: 'Dashboard',       icon: '◻',  roles: null,                                badge: 'none' as const },
  { href: '/indicadores',     label: 'Indicadores',     icon: '◈',  roles: null,                                badge: 'none' as const },
  { href: '/registros',       label: 'Registros',       icon: '◉',  roles: ['admin', 'editor', 'auditor'],      badge: 'none' as const },
  { href: '/revision',        label: 'Revisión',        icon: '◎',  roles: ['admin', 'auditor'],                badge: 'pending' as const },
  { href: '/notificaciones',  label: 'Notificaciones',  icon: '◬',  roles: null,                                badge: 'notif' as const },
  { href: '/reportes',        label: 'Reportes',        icon: '◧',  roles: null,                                badge: 'none' as const },
  { href: '/sedes',           label: 'Sedes',           icon: '◫',  roles: ['admin'],                           badge: 'none' as const },
  { href: '/configuracion',   label: 'Configuración',   icon: '◳',  roles: ['admin'],                           badge: 'none' as const },
  { href: '/perfil',          label: 'Mi perfil',       icon: '◐',  roles: null,                                badge: 'none' as const },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
  empresa?: string
  rol?: string
  pendingCount?: number
}

export default function Sidebar({ userEmail, userName, empresa, rol: rolProp, pendingCount: pendingCountProp }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Estado local que se rellena desde Supabase si los props no traen el rol
  const [rol,             setRol]             = useState(rolProp ?? '')
  const [empresaNombre,   setEmpresaNombre]   = useState(empresa ?? '')
  const [nombre,          setNombre]          = useState(userName ?? '')
  const [email,           setEmail]           = useState(userEmail ?? '')
  const [pendingCount,    setPendingCount]    = useState<number | null>(pendingCountProp ?? null)
  const [notifCount,      setNotifCount]      = useState<number>(0)

  useEffect(() => {
    // Si ya tenemos rol desde props (dashboard server-rendered), lo usamos directamente
    if (rolProp && rolProp !== 'viewer') {
      setRol(rolProp)
      if (empresa)  setEmpresaNombre(empresa)
      if (userName) setNombre(userName)
      if (userEmail) setEmail(userEmail)
      return
    }

    // En otras páginas: buscar perfil en Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      if (!email) setEmail(user.email ?? '')

      supabase
        .from('perfiles')
        .select('rol, nombre, empresa_id, empresas(nombre)')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) {
            // Sin perfil → intentar empresa propia y asumir admin
            supabase.from('empresas').select('nombre').eq('user_id', user.id).maybeSingle()
              .then(({ data: emp }) => {
                setRol('admin')
                if (emp) setEmpresaNombre(emp.nombre ?? '')
              })
            return
          }
          setRol(data.rol ?? 'viewer')
          if (data.nombre) setNombre(data.nombre)
          const empNombre = (data.empresas as unknown as { nombre: string } | undefined | null)?.nombre
          if (empNombre) setEmpresaNombre(empNombre)
        })
    })
  }, [supabase, rolProp, empresa, userName, userEmail, email])

  useEffect(() => {
    if (!rol || pendingCountProp !== undefined || !['admin', 'auditor'].includes(rol)) return
    supabase
      .from('registros_datos')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'en_revision')
      .then(({ count }) => {
        if (typeof count === 'number') setPendingCount(count)
      })
  }, [supabase, rol, pendingCountProp])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false)
        .then(({ count }) => {
          if (typeof count === 'number') setNotifCount(count)
        })
    })
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayEmail   = email   || userEmail   || ''
  const displayNombre  = nombre  || userName    || ''
  const displayEmpresa = empresaNombre || empresa || ''
  const initial        = (displayNombre?.[0] ?? displayEmail?.[0] ?? 'U').toUpperCase()

  const navItems = NAV_ALL.filter(item =>
    item.roles === null || item.roles.includes(rol)
  )

  return (
    <>
      <style>{`
        .sb-link:hover { background: rgba(74,222,128,0.08) !important; color: #d1fae5 !important; }
        .sb-logout:hover { background: rgba(239,68,68,0.12) !important; color: #fca5a5 !important; }
      `}</style>

      <aside style={{
        width: 240, minHeight: '100vh', background: '#0f172a',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>

        {/* Logo */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'block' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#4ade80', letterSpacing: '-0.5px' }}>ECØ</span>
            <span style={{ fontSize: 22, fontWeight: 300, color: '#94a3b8', letterSpacing: 3 }}>METRICS</span>
          </Link>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Sostenibilidad & GEI</div>
        </div>

        {/* Empresa badge */}
        {displayEmpresa && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '7px 10px' }}>
              <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 2 }}>EMPRESA</div>
              <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayEmpresa}
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const badgeVal = item.badge === 'pending' ? (pendingCount ?? 0)
                           : item.badge === 'notif'   ? notifCount
                           : 0
            return (
              <Link key={item.href} href={item.href} className="sb-link" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, textDecoration: 'none', fontSize: 14,
                justifyContent: 'space-between',
                fontWeight: active ? 600 : 400,
                color: active ? '#4ade80' : '#94a3b8',
                background: active ? 'rgba(74,222,128,0.12)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </span>
                {badgeVal > 0 && (
                  <span style={{
                    background: item.badge === 'notif' ? '#d97706' : '#dc2626',
                    color: '#fff', borderRadius: 999, padding: '2px 8px',
                    fontSize: 11, fontWeight: 700, minWidth: 22, textAlign: 'center',
                  }}>
                    {badgeVal > 99 ? '99+' : badgeVal}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Separador + badge rol */}
          {rol && (
            <>
              <div style={{ margin: '10px 0 6px', borderTop: '1px solid rgba(255,255,255,0.06)' }} />
              <div style={{ padding: '2px 12px' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                  color: canAdmin(rol) ? '#4ade80' : canEdit(rol) ? '#60a5fa' : '#94a3b8',
                }}>
                  {rol}
                </span>
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {displayEmail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {initial}
              </div>
              <div style={{ minWidth: 0 }}>
                {displayNombre && (
                  <p style={{ margin: 0, fontSize: 12, color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayNombre}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayEmail}
                </p>
              </div>
            </div>
          )}

          <button className="sb-logout" onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <LogOutIcon size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
