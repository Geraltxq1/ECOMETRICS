'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

interface Registro {
  id: string
  valor: number
  co2_calculado: number | null
  mes: number | null
  anio: number
  estado: string
  notas: string | null
  created_at: string
  empresas?: { nombre: string }
  sedes?: { nombre: string }
  indicadores?: { codigo: string; nombre: string; unidad: string }
}

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ESTADO_COLORS: Record<string, { background: string; color: string; border: string }> = {
  borrador:    { background: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  en_revision: { background: '#fffbeb', color: '#d97706', border: '#fde68a' },
  aprobado:    { background: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  rechazado:   { background: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

export default function RegistrosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser]             = useState<{ email?: string } | null>(null)
  const [registros, setRegistros]   = useState<Registro[]>([])
  const [loading, setLoading]       = useState(true)
  const [filtroAnio, setFiltroAnio] = useState<string>(String(new Date().getFullYear()))
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data } = await supabase
        .from('registros_datos')
        .select(`id, valor, co2_calculado, mes, anio, estado, notas, created_at,
          empresas(nombre), sedes(nombre), indicadores(codigo, nombre, unidad)`)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)

      setRegistros((data ?? []) as unknown as Registro[])
      setLoading(false)
    }
    load()
  }, [supabase])

  const anios = [...new Set(registros.map(r => String(r.anio)))].sort((a, b) => Number(b) - Number(a))

  const filtered = registros
    .filter(r => filtroAnio === 'Todos' || String(r.anio) === filtroAnio)
    .filter(r => filtroEstado === 'Todos' || r.estado === filtroEstado)

  const totalCO2 = filtered.reduce((s, r) => s + (r.co2_calculado ?? 0), 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Registros" email={user?.email}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Registros' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando registros…</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Registros de datos</h2>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                    {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · {totalCO2.toFixed(3)} tCO₂e
                  </p>
                </div>
                <Link href="/registros/nuevo" style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#16a34a,#15803d)',
                  color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  + Nuevo registro
                </Link>
              </div>

              {/* Filtros */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Año:</span>
                  {['Todos', ...anios].map(a => (
                    <button key={a} onClick={() => setFiltroAnio(a)}
                      style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', fontWeight: filtroAnio === a ? 600 : 400, border: `1.5px solid ${filtroAnio === a ? '#16a34a' : '#e2e8f0'}`, background: filtroAnio === a ? '#16a34a' : '#fff', color: filtroAnio === a ? '#fff' : '#64748b' }}>
                      {a}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Estado:</span>
                  {['Todos', 'borrador', 'en_revision', 'aprobado', 'rechazado'].map(e => (
                    <button key={e} onClick={() => setFiltroEstado(e)}
                      style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', fontWeight: filtroEstado === e ? 600 : 400, border: `1.5px solid ${filtroEstado === e ? '#16a34a' : '#e2e8f0'}`, background: filtroEstado === e ? '#16a34a' : '#fff', color: filtroEstado === e ? '#fff' : '#64748b' }}>
                      {e === 'en_revision' ? 'En revisión' : e.charAt(0).toUpperCase() + e.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>📝</div>
                    <p style={{ margin: 0, fontSize: 14 }}>No hay registros aún.</p>
                    <Link href="/registros/nuevo" style={{ display: 'inline-block', marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#16a34a', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                      Agregar primer registro
                    </Link>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Empresa', 'Sede', 'Indicador', 'Valor', 'tCO₂e', 'Período', 'Estado', 'Fecha'].map(h => (
                            <th key={h} style={th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(r => {
                          const ind  = r.indicadores as { codigo: string; unidad: string } | undefined
                          const eStyle = ESTADO_COLORS[r.estado] ?? ESTADO_COLORS.borrador
                          return (
                            <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>
                                {(r.empresas as { nombre: string } | undefined)?.nombre ?? '—'}
                              </td>
                              <td style={td}>{(r.sedes as { nombre: string } | undefined)?.nombre ?? '—'}</td>
                              <td style={td}>
                                <span style={{ fontWeight: 600, color: '#16a34a', fontSize: 12 }}>{ind?.codigo ?? '—'}</span>
                              </td>
                              <td style={td}>
                                {r.valor.toLocaleString('es-CO')} <span style={{ color: '#94a3b8', fontSize: 11 }}>{ind?.unidad}</span>
                              </td>
                              <td style={td}>
                                {r.co2_calculado != null
                                  ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{r.co2_calculado.toFixed(4)}</span>
                                  : '—'}
                              </td>
                              <td style={td}>{r.mes ? `${MESES[r.mes]} ${r.anio}` : r.anio}</td>
                              <td style={td}>
                                <span style={{ ...eStyle, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, display: 'inline-block', border: `1px solid ${eStyle.border}` }}>
                                  {r.estado === 'en_revision' ? 'En revisión' : r.estado}
                                </span>
                              </td>
                              <td style={td}>{new Date(r.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#374151' }
