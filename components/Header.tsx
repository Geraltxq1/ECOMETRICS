'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { BellIcon, BellOffIcon } from './Icons'
import BusquedaGlobal from './BusquedaGlobal'

interface Notificacion {
  id: string
  tipo: string
  mensaje: string
  leida: boolean
  created_at: string
  registro_id: string | null
}

interface HeaderProps {
  title: string
  email?: string
  empresa?: string
  breadcrumb?: { label: string; href?: string }[]
}

const TIPO_CFG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  aprobado:    { icon: 'A', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  rechazado:   { icon: 'R', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  publicado:   { icon: 'P', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  en_revision: { icon: 'E', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  default:     { icon: 'N', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24)    return `Hace ${h}h`
  const d = Math.floor(h / 24)
  return `Hace ${d} día${d > 1 ? 's' : ''}`
}

export default function Header({ title, email, empresa, breadcrumb }: HeaderProps) {
  const supabase   = useMemo(() => createClient(), [])
  const [notis, setNotis]       = useState<Notificacion[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const [marking, setMarking]   = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const unread = notis.filter(n => !n.leida).length

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notificaciones')
        .select('id, tipo, mensaje, leida, created_at, registro_id')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setNotis((data ?? []) as Notificacion[])
    }
    load()
  }, [supabase])

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

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

  const markOne = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await supabase.from('notificaciones').update({ leida: true } as never).eq('id', id)
    setNotis(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  return (
    <div style={{
      minHeight: 62, background: '#ffffff', borderBottom: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', flexShrink: 0, gap: 16, position: 'relative', zIndex: 50,
    }}>

      {/* Izquierda: breadcrumb + título */}
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: '#cbd5e1', fontSize: 11 }}>›</span>}
                {b.href
                  ? <a href={b.href} style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>{b.label}</a>
                  : <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{b.label}</span>}
              </span>
            ))}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>{title}</h1>
      </div>

      {/* Derecha: busqueda + empresa + campana + badge + email */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>

        <BusquedaGlobal />

        {empresa && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            {empresa}
          </span>
        )}

        {/* Campana */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowDrop(v => !v)} style={{
            position: 'relative', width: 38, height: 38, borderRadius: '50%',
            border: `1.5px solid ${showDrop ? '#16a34a' : '#e2e8f0'}`,
            background: showDrop ? '#f0fdf4' : '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, transition: 'all 0.15s',
          }}>
            <BellIcon size={17} color={showDrop ? '#16a34a' : '#374151'} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: '#dc2626', color: '#fff', borderRadius: 999,
                fontSize: 10, fontWeight: 800, minWidth: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', border: '2px solid #fff', letterSpacing: 0,
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showDrop && (
            <div style={{
              position: 'absolute', top: 46, right: 0, width: 360,
              background: '#fff', borderRadius: 16,
              boxShadow: '0 12px 40px rgba(15,23,42,0.14)',
              border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden',
            }}>
              {/* Cabecera dropdown */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
                background: '#fafafa',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Notificaciones</span>
                  {unread > 0 && (
                    <span style={{ background: '#dc2626', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>
                      {unread} nuevas
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button onClick={markAllRead} disabled={marking} style={{
                    background: 'none', border: 'none', fontSize: 11, color: '#16a34a',
                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    ✓ Marcar leídas
                  </button>
                )}
              </div>

              {/* Lista */}
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notis.length === 0 ? (
                  <div style={{ padding: '40px 18px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 10, color: '#cbd5e1' }}><BellOffIcon size={36} color="#cbd5e1" /></div>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Sin notificaciones</p>
                  </div>
                ) : notis.map(n => {
                  const cfg = TIPO_CFG[n.tipo] ?? TIPO_CFG.default
                  return (
                    <Link key={n.id}
                      href={n.registro_id ? `/registros/${n.registro_id}` : '/notificaciones'}
                      onClick={() => setShowDrop(false)}
                      style={{
                        display: 'flex', gap: 12, padding: '13px 18px',
                        borderBottom: '1px solid #f8fafc', textDecoration: 'none',
                        background: n.leida ? '#fff' : '#f0fdf4',
                        transition: 'background 0.1s',
                        borderLeft: n.leida ? 'none' : `3px solid ${cfg.color}`,
                      }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: cfg.bg,
                        border: `1px solid ${cfg.border}`, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                      }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#0f172a', fontWeight: n.leida ? 400 : 600, lineHeight: 1.45 }}>
                          {n.mensaje}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.4px', background: cfg.bg, padding: '1px 6px', borderRadius: 4 }}>
                            {n.tipo}
                          </span>
                          <span style={{ color: '#e2e8f0' }}>·</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{tiempoRelativo(n.created_at)}</span>
                        </div>
                      </div>
                      {!n.leida && (
                        <button onClick={e => markOne(n.id, e)} title="Marcar como leída" style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                          color: '#94a3b8', fontSize: 14, flexShrink: 0, alignSelf: 'flex-start',
                        }}>×</button>
                      )}
                    </Link>
                  )
                })}
              </div>

              {/* Footer dropdown */}
              <div style={{ padding: '11px 18px', borderTop: '1px solid #f1f5f9', background: '#fafafa', textAlign: 'center' }}>
                <Link href="/notificaciones" onClick={() => setShowDrop(false)} style={{
                  fontSize: 13, color: '#16a34a', fontWeight: 700, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  Ver todas las notificaciones →
                </Link>
              </div>
            </div>
          )}
        </div>

        <span style={{
          background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
          letterSpacing: '0.4px', textTransform: 'uppercase',
        }}>
          Sistema activo
        </span>

        {email && (
          <span style={{ fontSize: 13, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </span>
        )}
      </div>
    </div>
  )
}
