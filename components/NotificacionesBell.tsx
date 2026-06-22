'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import type { Notificacion } from '@/lib/types'
import { BellIcon } from './Icons'

const TIPO_MAP: Record<string, { letter: string; color: string; bg: string }> = {
  aprobado:           { letter: 'A', color: '#16a34a', bg: '#f0fdf4' },
  registro_aprobado:  { letter: 'A', color: '#16a34a', bg: '#f0fdf4' },
  rechazado:          { letter: 'R', color: '#dc2626', bg: '#fef2f2' },
  registro_rechazado: { letter: 'R', color: '#dc2626', bg: '#fef2f2' },
  publicado:          { letter: 'P', color: '#2563eb', bg: '#eff6ff' },
  en_revision:        { letter: 'E', color: '#d97706', bg: '#fffbeb' },
  registro_enviado:   { letter: 'E', color: '#d97706', bg: '#fffbeb' },
  miembro_unido:      { letter: 'M', color: '#7e22ce', bg: '#f5f3ff' },
}
function TipoIcon({ tipo }: { tipo: string }) {
  const cfg = TIPO_MAP[tipo] ?? { letter: (tipo[0] ?? 'N').toUpperCase(), color: '#64748b', bg: '#f8fafc' }
  return (
    <span style={{
      width: 32, height: 32, borderRadius: '50%', background: cfg.bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color: cfg.color,
    }}>{cfg.letter}</span>
  )
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export default function NotificacionesBell() {
  const supabase = createClient()
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      fetchNotifs(user.id)

      // Suscripción en tiempo real
      const channel = supabase
        .channel('notificaciones-bell')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`,
        }, (payload) => {
          setNotifs(prev => [payload.new as Notificacion, ...prev].slice(0, 20))
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cierra dropdown al hacer clic fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchNotifs(uid: string) {
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data ?? [])
  }

  async function marcarLeida(id: string) {
    await supabase.from('notificaciones').update({ leida: true } as never).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  async function marcarTodasLeidas() {
    if (!userId) return
    await supabase.from('notificaciones').update({ leida: true } as never).eq('usuario_id', userId).eq('leida', false)
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
  }

  const noLeidas = notifs.filter(n => !n.leida).length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
          color: '#64748b', fontSize: 20, display: 'flex', alignItems: 'center',
          transition: 'background 0.15s',
        }}
        title="Notificaciones"
      >
        <BellIcon size={18} color="#64748b" />
        {noLeidas > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#dc2626', color: '#fff',
            borderRadius: 999, fontSize: 10, fontWeight: 700,
            minWidth: 18, height: 18, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 4px', lineHeight: 1,
          }}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', width: 360, maxHeight: 480,
          background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          border: '1px solid #e2e8f0', zIndex: 9999, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
              Notificaciones {noLeidas > 0 && <span style={{ color: '#dc2626' }}>({noLeidas})</span>}
            </span>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodasLeidas}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#16a34a', fontWeight: 600 }}
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Sin notificaciones
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => { marcarLeida(n.id); setOpen(false) }}
                  style={{
                    display: 'flex', gap: 10, padding: '12px 16px',
                    borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                    background: n.leida ? '#fff' : '#f0fdf4',
                    transition: 'background 0.15s',
                  }}
                >
                  <TipoIcon tipo={n.tipo} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#1e293b', lineHeight: 1.4 }}>
                      {n.mensaje}
                    </p>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{tiempoRelativo(n.created_at)}</span>
                  </div>
                  {!n.leida && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9' }}>
            <Link
              href="/notificaciones"
              onClick={() => setOpen(false)}
              style={{ display: 'block', textAlign: 'center', fontSize: 13, color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}
            >
              Ver todas las notificaciones →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
