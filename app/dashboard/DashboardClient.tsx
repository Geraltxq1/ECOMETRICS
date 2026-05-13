'use client'

import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'
import RoleBadge from '@/components/RoleBadge'

interface Empresa { id: string; nombre: string; ciudad: string | null; industria: string | null }
interface Stats   { totalRegistros: number; totalCO2: number; totalSedes: number; indicadoresUsados: number }
interface MesData { mes: number; co2: number }
interface Registro {
  id: string
  valor: number
  co2_calculado: number | null
  mes: number | null
  anio: number
  estado: string
  created_at: string
  indicadores?: { codigo: string; nombre: string; unidad: string }
  sedes?: { nombre: string }
}

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ESTADO_COLORS: Record<string, { background: string; color: string }> = {
  borrador:    { background: '#f8fafc', color: '#64748b' },
  en_revision: { background: '#fffbeb', color: '#d97706' },
  aprobado:    { background: '#f0fdf4', color: '#16a34a' },
  rechazado:   { background: '#fef2f2', color: '#dc2626' },
}

interface Props {
  userEmail?: string
  userName?: string
  rol: string
  empresa: Empresa | null
  stats: Stats
  porMes: MesData[]
  ultimos: Registro[]
}

export default function DashboardClient({ userEmail, userName, rol, empresa, stats, porMes, ultimos }: Props) {
  const maxCO2 = Math.max(...porMes.map(m => m.co2), 0.001)
  const hora   = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={userEmail} userName={userName} empresa={empresa?.nombre} rol={rol} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Dashboard" email={userEmail} empresa={empresa?.nombre} />

        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {/* Bienvenida */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                {saludo}{userName ? `, ${userName}` : ''}
              </h2>
              <RoleBadge rol={rol} />
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
              {empresa
                ? `Empresa: ${empresa.nombre}${empresa.ciudad ? ` · ${empresa.ciudad}` : ''}${empresa.industria ? ` · ${empresa.industria}` : ''}`
                : 'Sin empresa asignada — ve a Configuración para completar tu perfil.'}
            </p>
          </div>

          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            <StatsCard title="Registros GRI"      value={String(stats.totalRegistros)}    description="Total ingresados"        color="#16a34a" icon="📝" />
            <StatsCard title="tCO₂e total"        value={stats.totalCO2.toFixed(3)}       description="Emisiones acumuladas"    color="#dc2626" icon="🌍" />
            <StatsCard title="Sedes activas"      value={String(stats.totalSedes)}         description="Unidades registradas"   color="#1d4ed8" icon="📍" />
            <StatsCard title="Indicadores usados" value={String(stats.indicadoresUsados)}  description="De los disponibles GRI" color="#7e22ce" icon="📈" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 24 }}>

            {/* Gráfico de barras mensual */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Emisiones mensuales {new Date().getFullYear()}
                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>(tCO₂e)</span>
              </h3>

              {stats.totalCO2 === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Sin datos. Agrega registros en la sección Registros.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
                  {porMes.map(m => {
                    const pct = (m.co2 / maxCO2) * 100
                    return (
                      <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        {m.co2 > 0 && (
                          <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600, writingMode: 'vertical-rl', textAlign: 'center' }}>
                            {m.co2.toFixed(2)}
                          </span>
                        )}
                        <div style={{
                          width: '100%',
                          height: `${Math.max(pct, m.co2 > 0 ? 4 : 0)}%`,
                          background: m.co2 > 0 ? 'linear-gradient(180deg,#dc2626,#ef4444)' : '#f1f5f9',
                          borderRadius: '4px 4px 0 0',
                          minHeight: m.co2 > 0 ? 4 : 0,
                        }} />
                        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 500 }}>{MESES[m.mes]}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Resumen alcances */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Resumen de alcances</h3>
              {[
                { label: 'Alcance 1', desc: 'Directo',          color: '#b45309', bg: '#fffbeb' },
                { label: 'Alcance 2', desc: 'Energía',          color: '#1d4ed8', bg: '#eff6ff' },
                { label: 'Alcance 3', desc: 'Cadena de valor',  color: '#7e22ce', bg: '#fdf4ff' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10, marginBottom: 10,
                  background: item.bg, border: `1px solid ${item.color}22`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>—</span>
                </div>
              ))}
              <a href="/reportes" style={{ display: 'block', textAlign: 'center', fontSize: 12, color: '#16a34a', fontWeight: 600, textDecoration: 'none', marginTop: 4 }}>
                Ver reporte completo →
              </a>
            </div>
          </div>

          {/* Últimos registros */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Últimos registros</h3>
              <a href="/registros" style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
            </div>

            {ultimos.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                <p style={{ margin: 0, fontSize: 13 }}>Sin registros aún.</p>
                <a href="/registros/nuevo" style={{ display: 'inline-block', marginTop: 12, padding: '8px 18px', borderRadius: 8, background: '#16a34a', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                  + Agregar primer registro
                </a>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Indicador', 'Sede', 'Valor', 'tCO₂e', 'Período', 'Estado'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ultimos.map(r => {
                      const ind  = r.indicadores as { codigo: string; nombre: string; unidad: string } | undefined
                      const sede = r.sedes as { nombre: string } | undefined
                      const eStyle = ESTADO_COLORS[r.estado] ?? ESTADO_COLORS.borrador
                      return (
                        <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ ...td, maxWidth: 200 }}>
                            <span style={{ fontWeight: 600, fontSize: 12, color: '#16a34a' }}>{ind?.codigo ?? '—'}</span>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind?.nombre}</div>
                          </td>
                          <td style={td}>{sede?.nombre ?? '—'}</td>
                          <td style={td}>{r.valor?.toLocaleString('es-CO')} <span style={{ fontSize: 11, color: '#94a3b8' }}>{ind?.unidad}</span></td>
                          <td style={td}>
                            {r.co2_calculado != null
                              ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{r.co2_calculado.toFixed(4)}</span>
                              : '—'}
                          </td>
                          <td style={td}>{r.mes ? `${MESES[r.mes]} ${r.anio}` : r.anio}</td>
                          <td style={td}>
                            <span style={{ ...eStyle, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, display: 'inline-block' }}>
                              {r.estado}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '12px 18px', fontSize: 13, color: '#374151' }
