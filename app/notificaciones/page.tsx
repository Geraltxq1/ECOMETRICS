'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { BellOffIcon, InboxIcon, MailIcon, CheckCircleIcon, XCircleIcon } from '@/components/Icons'

interface Notificacion {
  id: string
  tipo: string
  mensaje: string
  leida: boolean
  created_at: string
  registro_id: string | null
}

type Filtro = 'todas' | 'sin_leer' | 'aprobado' | 'rechazado' | 'publicado'

const TIPO_CFG: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  aprobado:    { icon: 'A', label: 'Aprobado',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  rechazado:   { icon: 'R', label: 'Rechazado',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  publicado:   { icon: 'P', label: 'Publicado',   color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  en_revision: { icon: 'E', label: 'En revisión', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24)    return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)     return `Hace ${d} día${d > 1 ? 's' : ''}`
  return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

function agruparPorFecha(notis: Notificacion[]): { fecha: string; items: Notificacion[] }[] {
  const grupos: Record<string, Notificacion[]> = {}
  for (const n of notis) {
    const key = new Date(n.created_at).toDateString()
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(n)
  }
  return Object.entries(grupos).map(([key, items]) => ({
    fecha: fechaCorta(items[0].created_at),
    items,
  }))
}

export default function NotificacionesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser]       = useState<{ email?: string } | null>(null)
  const [notis, setNotis]     = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState<Filtro>('todas')
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data } = await supabase
        .from('notificaciones')
        .select('id, tipo, mensaje, leida, created_at, registro_id')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      setNotis((data ?? []) as Notificacion[])
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtradas = notis.filter(n => {
    if (filtro === 'sin_leer') return !n.leida
    if (filtro === 'todas')    return true
    return n.tipo === filtro
  })

  const grupos = agruparPorFecha(filtradas)

  const stats = {
    total:     notis.length,
    sinLeer:   notis.filter(n => !n.leida).length,
    aprobados: notis.filter(n => n.tipo === 'aprobado').length,
    rechazados:notis.filter(n => n.tipo === 'rechazado').length,
    publicados:notis.filter(n => n.tipo === 'publicado').length,
  }

  const markAllRead = async () => {
    setMarking(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('notificaciones').update({ leida: true } as never)
        .eq('usuario_id', user.id).eq('leida', false)
      setNotis(prev => prev.map(n => ({ ...n, leida: true })))
    }
    setMarking(false)
  }

  const markOne = async (id: string) => {
    await supabase.from('notificaciones').update({ leida: true } as never).eq('id', id)
    setNotis(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  const deleteOne = async (id: string) => {
    await supabase.from('notificaciones').delete().eq('id', id)
    setNotis(prev => prev.filter(n => n.id !== id))
  }

  const FILTROS: { key: Filtro; label: string; count: number }[] = [
    { key: 'todas',     label: 'Todas',       count: stats.total     },
    { key: 'sin_leer',  label: 'Sin leer',    count: stats.sinLeer   },
    { key: 'aprobado',  label: 'Aprobados',   count: stats.aprobados },
    { key: 'rechazado', label: 'Rechazados',  count: stats.rechazados},
    { key: 'publicado', label: 'Publicados',  count: stats.publicados},
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Notificaciones" email={user?.email}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notificaciones' }]} />

        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando notificaciones…</div>
          ) : (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
                {[
                  { label: 'Total',      value: stats.total,      color: '#0f172a', bg: '#fff',    icon: <InboxIcon size={18} color="#64748b" /> },
                  { label: 'Sin leer',   value: stats.sinLeer,    color: '#dc2626', bg: '#fef2f2', icon: <MailIcon size={18} color="#dc2626" /> },
                  { label: 'Aprobados',  value: stats.aprobados,  color: '#16a34a', bg: '#f0fdf4', icon: <CheckCircleIcon size={18} color="#16a34a" /> },
                  { label: 'Rechazados', value: stats.rechazados, color: '#dc2626', bg: '#fef2f2', icon: <XCircleIcon size={18} color="#dc2626" /> },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ display: 'flex' }}>{s.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Cabecera acciones */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FILTROS.map(f => (
                    <button key={f.key} onClick={() => setFiltro(f.key)} style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: filtro === f.key ? 700 : 500,
                      border: `1.5px solid ${filtro === f.key ? '#16a34a' : '#e2e8f0'}`,
                      background: filtro === f.key ? '#16a34a' : '#fff',
                      color: filtro === f.key ? '#fff' : '#64748b',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      {f.label}
                      {f.count > 0 && (
                        <span style={{
                          background: filtro === f.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                          color: filtro === f.key ? '#fff' : '#64748b',
                          borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '0 5px',
                        }}>
                          {f.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {stats.sinLeer > 0 && (
                  <button onClick={markAllRead} disabled={marking} style={{
                    padding: '8px 16px', borderRadius: 10, border: '1.5px solid #bbf7d0',
                    background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: marking ? 0.7 : 1,
                  }}>
                    ✓ Marcar todas como leídas
                  </button>
                )}
              </div>

              {/* Lista agrupada por fecha */}
              {filtradas.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '80px 24px', textAlign: 'center' }}>
                  <div style={{ marginBottom: 16 }}><BellOffIcon size={52} color="#cbd5e1" /></div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                    {filtro === 'sin_leer' ? 'Estás al día' : 'Sin notificaciones'}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                    {filtro === 'sin_leer'
                      ? 'No tienes notificaciones pendientes de leer.'
                      : 'Las notificaciones de tus registros aparecerán aquí.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {grupos.map(g => (
                    <div key={g.fecha}>
                      {/* Separador de fecha */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                          {g.fecha}
                        </span>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                      </div>

                      {/* Tarjetas del grupo */}
                      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        {g.items.map((n, idx) => {
                          const cfg = TIPO_CFG[n.tipo] ?? { icon: 'N', label: n.tipo, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
                          return (
                            <div key={n.id} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 16,
                              padding: '18px 20px',
                              borderBottom: idx < g.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                              background: n.leida ? '#fff' : '#fafffe',
                              borderLeft: n.leida ? '4px solid transparent' : `4px solid ${cfg.color}`,
                              transition: 'background 0.15s',
                            }}>

                              {/* Ícono tipo */}
                              <div style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: cfg.bg, border: `1px solid ${cfg.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 20, flexShrink: 0,
                              }}>
                                {cfg.icon}
                              </div>

                              {/* Contenido */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                      <span style={{
                                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.5px', color: cfg.color,
                                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                                        padding: '2px 7px', borderRadius: 5,
                                      }}>
                                        {cfg.label}
                                      </span>
                                      {!n.leida && (
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                                      )}
                                    </div>
                                    <p style={{
                                      margin: 0, fontSize: 14, lineHeight: 1.5,
                                      color: '#0f172a', fontWeight: n.leida ? 400 : 600,
                                    }}>
                                      {n.mensaje}
                                    </p>
                                    <p style={{ margin: '5px 0 0', fontSize: 12, color: '#94a3b8' }}>
                                      {tiempoRelativo(n.created_at)}
                                    </p>
                                  </div>

                                  {/* Acciones */}
                                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    {n.registro_id && (
                                      <Link href={`/registros/${n.registro_id}`} style={{
                                        fontSize: 12, fontWeight: 600, color: '#16a34a',
                                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                                        borderRadius: 8, padding: '6px 12px', textDecoration: 'none',
                                        whiteSpace: 'nowrap',
                                      }}>
                                        Ver registro
                                      </Link>
                                    )}
                                    {!n.leida && (
                                      <button onClick={() => markOne(n.id)} title="Marcar como leída" style={{
                                        fontSize: 12, fontWeight: 600, color: '#64748b',
                                        background: '#f8fafc', border: '1px solid #e2e8f0',
                                        borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}>
                                        ✓ Leída
                                      </button>
                                    )}
                                    <button onClick={() => deleteOne(n.id)} title="Eliminar notificación" style={{
                                      fontSize: 13, color: '#94a3b8',
                                      background: 'none', border: 'none',
                                      cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
                                    }}>
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
