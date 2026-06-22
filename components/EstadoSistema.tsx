'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

interface Stats {
  totalRegistros: number
  totalSedes: number
  totalIndicadores: number
  ultimaActividad: string | null
  conectado: boolean
}

export default function EstadoSistema() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ totalRegistros: 0, totalSedes: 0, totalIndicadores: 0, ultimaActividad: null, conectado: false })
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    async function cargar() {
      try {
        const [regRes, sedeRes, indRes, logRes] = await Promise.all([
          supabase.from('registros_datos').select('id', { count: 'exact', head: true }),
          supabase.from('sedes').select('id', { count: 'exact', head: true }),
          supabase.from('indicadores').select('id', { count: 'exact', head: true }),
          supabase.from('audit_logs').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ])

        setStats({
          totalRegistros: regRes.count ?? 0,
          totalSedes: sedeRes.count ?? 0,
          totalIndicadores: indRes.count ?? 0,
          ultimaActividad: logRes.data?.created_at ?? null,
          conectado: !regRes.error,
        })
      } catch {
        setStats(s => ({ ...s, conectado: false }))
      }
      setCargando(false)
    }
    cargar()
  }, [supabase])

  const dot = (conectado: boolean) => (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: conectado ? '#16a34a' : '#dc2626',
      marginRight: 6, flexShrink: 0,
      boxShadow: conectado ? '0 0 0 3px rgba(22,163,74,0.2)' : '0 0 0 3px rgba(220,38,38,0.2)',
    }} />
  )

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setAbierto(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: abierto ? '#f0fdf4' : '#f8fafc',
          border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '6px 12px', cursor: 'pointer', fontSize: 12,
          color: '#64748b', fontWeight: 500,
        }}
        title="Estado del sistema"
      >
        {dot(stats.conectado)}
        <span>{stats.conectado ? 'Sistema OK' : 'Sin conexión'}</span>
      </button>

      {abierto && (
        <div style={{
          position: 'absolute', bottom: '110%', right: 0,
          background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid #e2e8f0', width: 260, zIndex: 9000, padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            {dot(stats.conectado)}
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              {stats.conectado ? 'Supabase conectado' : 'Error de conexión'}
            </span>
          </div>

          {cargando ? (
            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>Cargando…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Registros totales', value: stats.totalRegistros },
                { label: 'Sedes activas', value: stats.totalSedes },
                { label: 'Indicadores GRI', value: stats.totalIndicadores },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{value.toLocaleString('es-CO')}</span>
                </div>
              ))}
              {stats.ultimaActividad && (
                <div style={{ paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    Última actividad: {new Date(stats.ultimaActividad).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
