'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

type AuthUser = {
  id: string
  email: string
  created_at: string
  user_metadata: { role?: string; nombre_empresa?: string }
}

type Empresa = {
  id: string
  nombre: string
  user_id: string
  created_at: string
}

type Props = {
  currentUser: { id: string; email: string }
  users: AuthUser[]
  empresas: Empresa[]
}

type Tab = 'overview' | 'usuarios' | 'empresas'

export default function AdminDashboardClient({ currentUser, users, empresas }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('overview')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  const adminCount = users.filter(u => u.user_metadata?.role === 'admin').length
  const userCount = users.length - adminCount

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Resumen', icon: '◉' },
    { id: 'usuarios', label: 'Usuarios', icon: '◎' },
    { id: 'empresas', label: 'Empresas', icon: '▦' },
  ]

  return (
    <div style={s.layout}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>
            <span style={s.logoMain}>ECØ</span>
            <span style={s.logoSub}>METRICS</span>
          </div>
          <span style={s.adminBadge}>ADMIN</span>
        </div>

        <nav style={s.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={tab === item.id ? { ...s.navItem, ...s.navActive } : s.navItem}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.userRow}>
            <div style={s.avatar}>{(currentUser.email?.[0] ?? 'A').toUpperCase()}</div>
            <div style={s.userInfo}>
              <p style={s.userEmail}>{currentUser.email}</p>
              <p style={s.userRole}>Administrador</p>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <div style={s.header}>
          <h1 style={s.pageTitle}>
            {tab === 'overview' ? 'Resumen general' : tab === 'usuarios' ? 'Usuarios' : 'Empresas'}
          </h1>
          <p style={s.pageDate}>
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {tab === 'overview' && (
          <OverviewTab
            users={users}
            empresas={empresas}
            adminCount={adminCount}
            userCount={userCount}
          />
        )}
        {tab === 'usuarios' && <UsuariosTab users={users} />}
        {tab === 'empresas' && <EmpresasTab empresas={empresas} users={users} />}
      </main>
    </div>
  )
}

function OverviewTab({
  users, empresas, adminCount, userCount,
}: {
  users: AuthUser[]
  empresas: Empresa[]
  adminCount: number
  userCount: number
}) {
  return (
    <div>
      <div style={s.statsGrid}>
        <StatCard value={users.length}    label="Usuarios totales"   accent="#0f766e" light="#f0fdfa" border="#99f6e4" />
        <StatCard value={empresas.length} label="Empresas"           accent="#0369a1" light="#f0f9ff" border="#bae6fd" />
        <StatCard value={adminCount}      label="Administradores"    accent="#7c3aed" light="#faf5ff" border="#ddd6fe" />
        <StatCard value={userCount}       label="Usuarios regulares" accent="#b45309" light="#fffbeb" border="#fde68a" />
      </div>

      <div style={s.section}>
        <h2 style={s.sectionTitle}>Empresas recientes</h2>
        <div style={s.tableWrap}>
          <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 2fr 1fr' }}>
            <span>Empresa</span>
            <span>Propietario</span>
            <span>Fecha</span>
          </div>
          {empresas.slice(0, 8).map(e => {
            const owner = users.find(u => u.id === e.user_id)
            return (
              <div key={e.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 2fr 1fr' }}>
                <span style={s.boldCell}>{e.nombre}</span>
                <span style={s.mutedCell}>{owner?.email ?? '—'}</span>
                <span style={s.dateCell}>{fmtDate(e.created_at)}</span>
              </div>
            )
          })}
          {empresas.length === 0 && (
            <div style={s.emptyRow}>Sin empresas registradas aún</div>
          )}
        </div>
      </div>
    </div>
  )
}

function UsuariosTab({ users }: { users: AuthUser[] }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>Todos los usuarios ({users.length})</h2>
      <div style={s.tableWrap}>
        <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 1.5fr 1fr 1fr' }}>
          <span>Correo</span>
          <span>Empresa</span>
          <span>Rol</span>
          <span>Registro</span>
        </div>
        {users.map(u => (
          <div key={u.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1.5fr 1fr 1fr' }}>
            <span style={s.boldCell}>{u.email || '—'}</span>
            <span style={s.mutedCell}>{u.user_metadata?.nombre_empresa ?? '—'}</span>
            <RoleBadge role={u.user_metadata?.role} />
            <span style={s.dateCell}>{fmtDate(u.created_at)}</span>
          </div>
        ))}
        {users.length === 0 && (
          <div style={s.emptyRow}>Sin usuarios registrados aún</div>
        )}
      </div>
    </div>
  )
}

function EmpresasTab({ empresas, users }: { empresas: Empresa[]; users: AuthUser[] }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>Todas las empresas ({empresas.length})</h2>
      <div style={s.tableWrap}>
        <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 2fr 1fr' }}>
          <span>Nombre</span>
          <span>Propietario</span>
          <span>Registro</span>
        </div>
        {empresas.map(e => {
          const owner = users.find(u => u.id === e.user_id)
          return (
            <div key={e.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 2fr 1fr' }}>
              <span style={s.boldCell}>{e.nombre}</span>
              <span style={s.mutedCell}>{owner?.email ?? '—'}</span>
              <span style={s.dateCell}>{fmtDate(e.created_at)}</span>
            </div>
          )
        })}
        {empresas.length === 0 && (
          <div style={s.emptyRow}>Sin empresas registradas aún</div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  value, label, accent, light, border,
}: {
  value: number; label: string; accent: string; light: string; border: string
}) {
  return (
    <div style={{ ...s.statCard, background: light, borderColor: border }}>
      <span style={{ ...s.statValue, color: accent }}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  )
}

function RoleBadge({ role }: { role?: string }) {
  const isAdmin = role === 'admin'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      background: isAdmin ? '#f0fdfa' : '#f8fafc',
      color: isAdmin ? '#0f766e' : '#64748b',
      border: `1px solid ${isAdmin ? '#99f6e4' : '#e2e8f0'}`,
    }}>
      {isAdmin ? 'Admin' : 'Usuario'}
    </span>
  )
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const s: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', sans-serif",
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  sidebarTop: {
    padding: '28px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  logo: {
    marginBottom: 10,
  },
  logoMain: {
    fontSize: 22,
    fontWeight: 800,
    color: '#4ade80',
    letterSpacing: '-0.5px',
  },
  logoSub: {
    fontSize: 22,
    fontWeight: 300,
    color: '#94a3b8',
    letterSpacing: 2,
  },
  adminBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    background: '#0f766e',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  navActive: {
    background: 'rgba(255,255,255,0.08)',
    color: '#f1f5f9',
  },
  navIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#0f766e',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 700,
    flexShrink: 0,
  },
  userInfo: {
    overflow: 'hidden',
  },
  userEmail: {
    margin: 0,
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    margin: 0,
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  logoutBtn: {
    width: '100%',
    padding: '8px',
    borderRadius: 8,
    border: 'none',
    background: 'rgba(255,255,255,0.06)',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    background: '#f8fafc',
    padding: '40px 44px',
    overflowY: 'auto',
  },
  header: {
    marginBottom: 32,
  },
  pageTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#0f172a',
  },
  pageDate: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  statsGrid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    marginBottom: 36,
  },
  statCard: {
    padding: '24px 20px',
    borderRadius: 16,
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statValue: {
    fontSize: 38,
    fontWeight: 700,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 500,
  },
  section: {
    marginTop: 0,
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: 18,
    fontWeight: 600,
    color: '#1e293b',
  },
  tableWrap: {
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    overflow: 'hidden',
  },
  tableHead: {
    display: 'grid',
    padding: '12px 20px',
    background: '#f1f5f9',
    color: '#64748b',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    borderBottom: '1px solid #e2e8f0',
  },
  tableRow: {
    display: 'grid',
    padding: '14px 20px',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
  },
  boldCell: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1e293b',
  },
  mutedCell: {
    fontSize: 13,
    color: '#64748b',
  },
  dateCell: {
    fontSize: 13,
    color: '#94a3b8',
  },
  emptyRow: {
    padding: '32px 20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
  },
}
