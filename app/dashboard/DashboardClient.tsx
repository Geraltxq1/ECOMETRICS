'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'
import RoleBadge from '@/components/RoleBadge'
import EstadoBadge from '@/components/EstadoBadge'
import EstadoSistema from '@/components/EstadoSistema'
import { FileTextIcon, GlobeIcon, MapPinIcon, TrendingUpIcon, BarChartIcon } from '@/components/Icons'

interface Empresa    { id: string; nombre: string; ciudad: string | null; industria: string | null }
interface Stats      { totalRegistros: number; totalCO2: number; totalSedes: number; indicadoresUsados: number }
interface MesData    { mes: number; co2: number }
interface CatData    { categoria: string; co2: number }
interface SedeData   { sede: string; co2: number }
interface Registro   { id: string; valor: number; co2_calculado: number | null; mes: number | null; anio: number; estado: string; created_at: string; indicadores?: { codigo: string; nombre: string; unidad: string }; sedes?: { nombre: string } }

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const CAT_CONFIG: Record<string, { color: string; label: string }> = {
  energia:   { color: '#b45309', label: 'Energía'   },
  agua:      { color: '#1d4ed8', label: 'Agua'      },
  residuos:  { color: '#7e22ce', label: 'Residuos'  },
  emisiones: { color: '#dc2626', label: 'Emisiones' },
  otro:      { color: '#64748b', label: 'Otro'      },
}

interface Props {
  userEmail?: string
  userName?: string
  rol: string
  empresa: Empresa | null
  stats: Stats
  porMes: MesData[]
  porCategoria?: CatData[]
  porSede?: SedeData[]
  indicadorMasUsado?: { nombre: string; count: number } | null
  ultimos: Registro[]
}

// Gráfico de dona SVG puro
function DonutChart({ data }: { data: CatData[] }) {
  const total = data.reduce((s, d) => s + d.co2, 0)
  if (total === 0) return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
      Sin datos de categorías
    </div>
  )

  const R = 60, cx = 80, cy = 80, stroke = 28
  const arcs = data.reduce<{ categoria: string; co2: number; pct: number; start: number }[]>((acc, d) => {
    const pct = d.co2 / total
    const start = acc.length > 0 ? acc[acc.length - 1].start + acc[acc.length - 1].pct : 0
    return [...acc, { ...d, pct, start }]
  }, [])

  function arcPath(start: number, pct: number) {
    const a0 = (start * 2 * Math.PI) - Math.PI / 2
    const a1 = ((start + pct) * 2 * Math.PI) - Math.PI / 2
    const x0 = cx + R * Math.cos(a0)
    const y0 = cy + R * Math.sin(a0)
    const x1 = cx + R * Math.cos(a1)
    const y1 = cy + R * Math.sin(a1)
    const large = pct > 0.5 ? 1 : 0
    return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {arcs.map((a, i) => {
          const cfg = CAT_CONFIG[a.categoria] ?? CAT_CONFIG.otro
          return (
            <path key={i} d={arcPath(a.start, a.pct)} fill="none"
              stroke={cfg.color} strokeWidth={stroke} strokeLinecap="butt" />
          )
        })}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="18" fontWeight="700" fill="#0f172a">{(total).toFixed(1)}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#94a3b8">tCO₂e</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {arcs.map((a, i) => {
          const cfg = CAT_CONFIG[a.categoria] ?? CAT_CONFIG.otro
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#374151', flex: 1 }}>{cfg.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{(a.pct * 100).toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Gráfico de barras por sede
function BarrasSede({ data }: { data: SedeData[] }) {
  const maxCO2 = Math.max(...data.map(d => d.co2), 0.001)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{d.sede}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{d.co2.toFixed(3)} tCO₂e</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.co2 / maxCO2) * 100}%`, background: 'linear-gradient(90deg, #16a34a, #15803d)', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardClient({ userEmail, userName, rol, empresa, stats, porMes, porCategoria = [], porSede = [], indicadorMasUsado, ultimos }: Props) {
  const maxCO2 = Math.max(...porMes.map(m => m.co2), 0.001)
  const hora   = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const sedeMasEmisiones = porSede[0] ?? null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={userEmail} userName={userName} empresa={empresa?.nombre} rol={rol} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Dashboard" email={userEmail} empresa={empresa?.nombre} />

        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {/* Bienvenida */}
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                  {saludo}{userName ? `, ${userName.split(' ')[0]}` : ''}
                </h2>
                <RoleBadge rol={rol} />
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                {empresa
                  ? `${empresa.nombre}${empresa.ciudad ? ` · ${empresa.ciudad}` : ''}${empresa.industria ? ` · ${empresa.industria}` : ''}`
                  : 'Sin empresa — ve a Configuración para completar tu perfil.'}
              </p>
            </div>
            <EstadoSistema />
          </div>

          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <StatsCard title="Registros GRI"      value={String(stats.totalRegistros)}   description="Total ingresados"       color="#16a34a" icon={<FileTextIcon  size={20} color="#16a34a" />} />
            <StatsCard title="tCO₂e total"        value={stats.totalCO2.toFixed(3)}      description="Emisiones acumuladas"   color="#dc2626" icon={<GlobeIcon     size={20} color="#dc2626" />} />
            <StatsCard title="Sedes activas"      value={String(stats.totalSedes)}        description="Unidades registradas"  color="#1d4ed8" icon={<MapPinIcon    size={20} color="#1d4ed8" />} />
            <StatsCard title="Indicadores usados" value={String(stats.indicadoresUsados)} description="Indicadores distintos" color="#7e22ce" icon={<TrendingUpIcon size={20} color="#7e22ce" />} />
          </div>

          {/* Cards especiales */}
          {(indicadorMasUsado || sedeMasEmisiones) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {indicadorMasUsado && (
                <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: 14, padding: '20px 24px', color: '#fff' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Indicador más usado este mes</p>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{indicadorMasUsado.nombre}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>{indicadorMasUsado.count} registro{indicadorMasUsado.count !== 1 ? 's' : ''} este mes</p>
                </div>
              )}
              {sedeMasEmisiones && (
                <div style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', borderRadius: 14, padding: '20px 24px', color: '#fff' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sede con más emisiones</p>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{sedeMasEmisiones.sede}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#fca5a5' }}>{sedeMasEmisiones.co2.toFixed(3)} tCO₂e acumuladas</p>
                </div>
              )}
            </div>
          )}

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 24 }}>

            {/* Línea mensual */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Emisiones mensuales {new Date().getFullYear()}
                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>(tCO₂e)</span>
              </h3>

              {stats.totalCO2 === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                  <div style={{ marginBottom: 8 }}><BarChartIcon size={40} color="#cbd5e1" /></div>
                  <p style={{ margin: '0 0 12px', fontSize: 13 }}>Sin datos aún.</p>
                  <Link href="/registros/nuevo" style={{ padding: '8px 16px', borderRadius: 8, background: '#16a34a', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                    Crear primer registro
                  </Link>
                </div>
              ) : (
                <>
                  {/* Gráfico SVG de línea */}
                  <svg width="100%" viewBox="0 0 520 140" style={{ overflow: 'visible' }}>
                    {/* Grid horizontal */}
                    {[0, 0.25, 0.5, 0.75, 1].map(t => (
                      <line key={t} x1="0" y1={120 - t * 110} x2="520" y2={120 - t * 110} stroke="#f1f5f9" strokeWidth="1" />
                    ))}
                    {/* Área rellena */}
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M ${porMes.map((m, i) => `${i * 43 + 14},${120 - (m.co2 / maxCO2) * 110}`).join(' L ')} L ${43 * 11 + 14},120 L 14,120 Z`}
                      fill="url(#grad)"
                    />
                    {/* Línea */}
                    <polyline
                      points={porMes.map((m, i) => `${i * 43 + 14},${120 - (m.co2 / maxCO2) * 110}`).join(' ')}
                      fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round"
                    />
                    {/* Puntos */}
                    {porMes.map((m, i) => m.co2 > 0 && (
                      <circle key={i} cx={i * 43 + 14} cy={120 - (m.co2 / maxCO2) * 110} r="4" fill="#16a34a" stroke="#fff" strokeWidth="2" />
                    ))}
                    {/* Etiquetas mes */}
                    {porMes.map((m, i) => (
                      <text key={i} x={i * 43 + 14} y="138" textAnchor="middle" fontSize="9" fill="#94a3b8">{MESES[m.mes]}</text>
                    ))}
                  </svg>
                </>
              )}
            </div>

            {/* Dona por categoría */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Por categoría</h3>
              <DonutChart data={porCategoria} />
            </div>
          </div>

          {/* Barras por sede */}
          {porSede.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Emisiones por sede (aprobadas + publicadas)</h3>
              <BarrasSede data={porSede} />
            </div>
          )}

          {/* Últimos registros */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Últimos 5 registros</h3>
              <Link href="/registros" style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
            </div>

            {ultimos.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ marginBottom: 10 }}><FileTextIcon size={36} color="#cbd5e1" /></div>
                <p style={{ margin: '0 0 12px', fontSize: 13 }}>Sin registros aún.</p>
                <Link href="/registros/nuevo" style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 8, background: '#16a34a', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                  + Crear primer registro
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Indicador', 'Sede', 'Valor', 'tCO₂e', 'Período', 'Estado', 'Acción'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ultimos.map(r => {
                      const ind  = r.indicadores as { codigo: string; nombre: string; unidad: string } | undefined
                      const sede = r.sedes as { nombre: string } | undefined
                      return (
                        <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ ...td, maxWidth: 180 }}>
                            <span style={{ fontWeight: 600, fontSize: 11, color: '#16a34a' }}>{ind?.codigo}</span>
                            <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind?.nombre}</div>
                          </td>
                          <td style={td}>{sede?.nombre ?? '—'}</td>
                          <td style={td}>{r.valor?.toLocaleString('es-CO')} <span style={{ fontSize: 10, color: '#94a3b8' }}>{ind?.unidad}</span></td>
                          <td style={td}>
                            {r.co2_calculado != null
                              ? <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>{r.co2_calculado.toFixed(4)}</span>
                              : '—'}
                          </td>
                          <td style={td}>{r.mes ? `${MESES[r.mes]} ${r.anio}` : r.anio}</td>
                          <td style={td}><EstadoBadge estado={r.estado} size="sm" /></td>
                          <td style={td}>
                            <Link href={`/registros/${r.id}`} style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, textDecoration: 'none', padding: '3px 8px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
                              Ver →
                            </Link>
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
const td: React.CSSProperties = { padding: '11px 18px', fontSize: 13, color: '#374151' }
