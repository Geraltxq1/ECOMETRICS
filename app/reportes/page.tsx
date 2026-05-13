'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'

interface Registro {
  mes: number | null
  anio: number
  sede_id: string | null
  co2_calculado: number | null
  indicadores?: { alcance: string | null }
}

interface ResumenMes { mes: number; label: string; co2: number }
interface ResumenSede { nombre: string; co2: number }

const MESES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function ReportesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser]           = useState<{ email?: string } | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [sedesMap, setSedesMap]   = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(true)
  const [anio, setAnio]           = useState(new Date().getFullYear())

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [regRes, sedRes] = await Promise.all([
        supabase.from('registros_datos')
          .select('mes, anio, sede_id, co2_calculado, indicadores(alcance)')
          .eq('usuario_id', user.id),
        supabase.from('sedes').select('id, nombre'),
      ])

      setRegistros((regRes.data ?? []) as unknown as Registro[])
      const map: Record<string, string> = {}
      ;(sedRes.data ?? []).forEach(s => { map[s.id] = s.nombre })
      setSedesMap(map)
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtrados = registros.filter(r => r.anio === anio)

  const totalCO2 = filtrados.reduce((s, r) => s + (r.co2_calculado ?? 0), 0)
  const alcance1 = filtrados.filter(r => (r.indicadores as { alcance: string | null } | undefined)?.alcance === 'alcance_1').reduce((s, r) => s + (r.co2_calculado ?? 0), 0)
  const alcance2 = filtrados.filter(r => (r.indicadores as { alcance: string | null } | undefined)?.alcance === 'alcance_2').reduce((s, r) => s + (r.co2_calculado ?? 0), 0)
  const alcance3 = filtrados.filter(r => (r.indicadores as { alcance: string | null } | undefined)?.alcance === 'alcance_3').reduce((s, r) => s + (r.co2_calculado ?? 0), 0)

  const porMes: ResumenMes[] = MESES_LABELS.map((label, i) => ({
    mes: i + 1, label,
    co2: filtrados.filter(r => r.mes === i + 1).reduce((s, r) => s + (r.co2_calculado ?? 0), 0),
  }))
  const maxCO2 = Math.max(...porMes.map(m => m.co2), 0.001)

  // Comparativo por sede
  const porSede: ResumenSede[] = Object.entries(
    filtrados.reduce((acc: Record<string, number>, r) => {
      const sedeKey = r.sede_id ? (sedesMap[r.sede_id] ?? r.sede_id) : 'Sin sede'
      acc[sedeKey] = (acc[sedeKey] ?? 0) + (r.co2_calculado ?? 0)
      return acc
    }, {})
  ).map(([nombre, co2]) => ({ nombre, co2 })).sort((a, b) => b.co2 - a.co2)

  const anios = [...new Set(registros.map(r => r.anio))].sort((a, b) => b - a)

  const handleExport = () => {
    const lines = [
      'Mes,tCO2e',
      ...porMes.map(m => `${m.label},${m.co2.toFixed(6)}`),
      `Total,${totalCO2.toFixed(6)}`,
      '',
      'Sede,tCO2e',
      ...porSede.map(s => `${s.nombre},${s.co2.toFixed(6)}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `reporte_emisiones_${anio}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Reportes" email={user?.email}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reportes' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Generando reporte…</div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Reporte de emisiones</h2>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {[anio - 1, anio, anio + 1, ...anios]
                      .filter((a, i, arr) => arr.indexOf(a) === i).sort((a, b) => b - a).slice(0, 5)
                      .map(a => (
                        <button key={a} onClick={() => setAnio(a)} style={{
                          padding: '5px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                          border: `1.5px solid ${anio === a ? '#16a34a' : '#e2e8f0'}`,
                          background: anio === a ? '#16a34a' : '#fff',
                          color: anio === a ? '#fff' : '#64748b',
                          fontWeight: anio === a ? 600 : 400,
                        }}>{a}</button>
                      ))}
                  </div>
                </div>
                <button onClick={handleExport} style={{
                  padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  ⬇ Exportar CSV
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                <StatsCard title="Total tCO₂e"          value={totalCO2.toFixed(3)} description={`Año ${anio}`}           color="#dc2626" icon="🌍" />
                <StatsCard title="Alcance 1 (directo)"  value={alcance1.toFixed(3)} description="Emisiones propias"        color="#b45309" icon="🔥" />
                <StatsCard title="Alcance 2 (energía)"  value={alcance2.toFixed(3)} description="Electricidad comprada"    color="#1d4ed8" icon="⚡" />
                <StatsCard title="Alcance 3 (cadena)"   value={alcance3.toFixed(3)} description="Emisiones indirectas"     color="#7e22ce" icon="🔗" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 24 }}>

                {/* Gráfico barras mensual */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '28px' }}>
                  <h3 style={{ margin: '0 0 24px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    Emisiones mensuales {anio} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13 }}>(tCO₂e)</span>
                  </h3>
                  {totalCO2 === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                      <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
                      <p style={{ margin: 0, fontSize: 14 }}>Sin datos para {anio}. Agrega registros.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200 }}>
                      {porMes.map(m => {
                        const pct = (m.co2 / maxCO2) * 100
                        return (
                          <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                            {m.co2 > 0 && (
                              <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600, writingMode: 'vertical-rl', textAlign: 'center' }}>
                                {m.co2.toFixed(2)}
                              </span>
                            )}
                            <div style={{
                              width: '100%', height: `${Math.max(pct, m.co2 > 0 ? 4 : 0)}%`,
                              background: m.co2 > 0 ? 'linear-gradient(180deg,#dc2626,#ef4444)' : '#f1f5f9',
                              borderRadius: '4px 4px 0 0', minHeight: m.co2 > 0 ? 4 : 0,
                            }} />
                            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 500 }}>{m.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Comparativo por sede */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '28px' }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Por sede</h3>
                  {porSede.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin datos.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {porSede.slice(0, 6).map(s => {
                        const pct = totalCO2 > 0 ? (s.co2 / totalCO2) * 100 : 0
                        return (
                          <div key={s.nombre}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{s.nombre}</span>
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>{s.co2.toFixed(3)}</span>
                            </div>
                            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#dc2626,#ef4444)', borderRadius: 3 }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla por alcance */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Detalle por alcance — {anio}</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Alcance', 'Descripción', 'tCO₂e', '% del total'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { alcance: 1, desc: 'Emisiones directas (combustión propia)', co2: alcance1 },
                      { alcance: 2, desc: 'Emisiones indirectas (energía comprada)', co2: alcance2 },
                      { alcance: 3, desc: 'Otras emisiones indirectas (cadena de valor)', co2: alcance3 },
                    ].map(row => (
                      <tr key={row.alcance} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={td}>
                          <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                            Alcance {row.alcance}
                          </span>
                        </td>
                        <td style={{ ...td, color: '#64748b' }}>{row.desc}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#dc2626' }}>{row.co2.toFixed(4)}</td>
                        <td style={td}>{totalCO2 > 0 ? ((row.co2 / totalCO2) * 100).toFixed(1) + '%' : '—'}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                      <td style={{ ...td, fontWeight: 700 }} colSpan={2}>Total</td>
                      <td style={{ ...td, fontWeight: 800, color: '#dc2626', fontSize: 15 }}>{totalCO2.toFixed(4)}</td>
                      <td style={td}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }
const td: React.CSSProperties = { padding: '14px 20px', fontSize: 14, color: '#374151' }
