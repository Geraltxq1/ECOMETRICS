'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import EstadoBadge from '@/components/EstadoBadge'
import ModalConfirmacion from '@/components/ModalConfirmacion'
import { FileTextIcon, DownloadIcon } from '@/components/Icons'
import { exportarRegistrosCSV, type RegistroExport } from '@/lib/exportar'
import { registrarAuditoria } from '@/lib/auditoria'

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
  sedes?: { nombre: string; id: string }
  indicadores?: { codigo: string; nombre: string; unidad: string; categoria: string | null }
}

interface OpcionFiltro { id: string; nombre: string }

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const ANIOS = Array.from({ length: 7 }, (_, i) => String(new Date().getFullYear() - i))
const ESTADOS = ['borrador', 'en_revision', 'aprobado', 'rechazado', 'publicado']
const CATEGORIAS = ['energia', 'agua', 'residuos', 'emisiones']

type SortKey = 'anio' | 'valor' | 'co2_calculado' | 'estado' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function RegistrosPage() {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser]       = useState<{ id: string; email?: string } | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [sedes, setSedes]     = useState<OpcionFiltro[]>([])
  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId]     = useState<string | null>(null)
  const [empresaNombre, setEmpresaNombre] = useState('ECOMETRICS')
  const [exportando, setExportando]   = useState(false)
  const [exportMsg, setExportMsg]     = useState<string | null>(null)

  // Filtros
  const [filtroAnio, setFiltroAnio]         = useState('Todos')
  const [filtroEstado, setFiltroEstado]     = useState('Todos')
  const [filtroSede, setFiltroSede]         = useState('Todos')
  const [filtroCategoria, setFiltroCategoria] = useState('Todos')
  const [filtroDesde, setFiltroDesde]       = useState('')
  const [filtroHasta, setFiltroHasta]       = useState('')
  const [busqueda, setBusqueda]             = useState('')

  // Ordenamiento
  const [sortKey, setSortKey]   = useState<SortKey>('created_at')
  const [sortDir, setSortDir]   = useState<SortDir>('desc')

  // Acciones
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ id: string; estado: string } | null>(null)
  const [sendingId, setSendingId]     = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('user_id', user.id).single()
      if (perfil?.empresa_id) {
        setEmpresaId(perfil.empresa_id)
        const [sedesRes, empresaRes] = await Promise.all([
          supabase.from('sedes').select('id, nombre').eq('empresa_id', perfil.empresa_id).order('nombre'),
          supabase.from('empresas').select('nombre').eq('id', perfil.empresa_id).single(),
        ])
        setSedes(sedesRes.data ?? [])
        if (empresaRes.data?.nombre) setEmpresaNombre(empresaRes.data.nombre)
      }
    }
    init()
  }, [supabase])

  async function handleExportarCSV() {
    if (!empresaId) return
    setExportando(true)
    setExportMsg(null)

    const { data, error } = await supabase
      .from('registros_datos')
      .select(`created_at, valor, co2_calculado, estado, usuario_id,
        sedes(nombre), indicadores(codigo, nombre, unidad, categoria)`)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      setExportMsg('Error al obtener los registros para exportar.')
      setExportando(false)
      return
    }

    const userIds = [...new Set(data.map(r => r.usuario_id).filter(Boolean))]
    const { data: perfilesData } = await supabase.from('perfiles').select('user_id, email').in('user_id', userIds)
    const emailMap = new Map(perfilesData?.map(p => [p.user_id, p.email]) ?? [])

    const filas: RegistroExport[] = data.map(r => {
      const sede = r.sedes as unknown as { nombre: string } | null
      const ind  = r.indicadores as unknown as { codigo: string; nombre: string; unidad: string; categoria: string | null } | null
      return {
        created_at:       r.created_at,
        sede_nombre:      sede?.nombre ?? '—',
        indicador_codigo: ind?.codigo ?? '—',
        indicador_nombre: ind?.nombre ?? '—',
        categoria:        ind?.categoria ?? '—',
        valor:            r.valor,
        unidad:           ind?.unidad ?? '',
        co2_calculado:    r.co2_calculado,
        estado:           r.estado,
        usuario_email:    (r.usuario_id ? emailMap.get(r.usuario_id) : null) ?? '—',
      }
    })

    setExportMsg(`Descargando ${filas.length} registros…`)
    exportarRegistrosCSV(filas, empresaNombre)

    setExportando(false)
    setTimeout(() => setExportMsg(null), 4000)
  }

  const fetchRegistros = useCallback(async () => {
    if (!user) return
    setLoading(true)

    let query = supabase
      .from('registros_datos')
      .select(`id, valor, co2_calculado, mes, anio, estado, notas, created_at,
        empresas(nombre), sedes(id, nombre), indicadores(codigo, nombre, unidad, categoria)`)
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (filtroAnio !== 'Todos') query = query.eq('anio', Number(filtroAnio))
    if (filtroEstado !== 'Todos') query = query.eq('estado', filtroEstado)

    const { data } = await query
    setRegistros((data ?? []) as unknown as Registro[])
    setLoading(false)
  }, [supabase, user, filtroAnio, filtroEstado])

  useEffect(() => { fetchRegistros() }, [fetchRegistros])

  // Filtros client-side (sede, categoría, fechas, búsqueda)
  const filtered = useMemo(() => {
    let r = [...registros]

    if (filtroSede !== 'Todos') {
      r = r.filter(reg => {
        const s = reg.sedes as { id: string } | undefined
        return s?.id === filtroSede
      })
    }
    if (filtroCategoria !== 'Todos') {
      r = r.filter(reg => {
        const ind = reg.indicadores as { categoria: string | null } | undefined
        return ind?.categoria === filtroCategoria
      })
    }
    if (filtroDesde) r = r.filter(reg => reg.created_at >= filtroDesde)
    if (filtroHasta) r = r.filter(reg => reg.created_at <= filtroHasta + 'T23:59:59')
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      r = r.filter(reg => {
        const ind = reg.indicadores as { nombre: string; codigo: string } | undefined
        return ind?.nombre?.toLowerCase().includes(q) || ind?.codigo?.toLowerCase().includes(q)
      })
    }

    // Ordenamiento
    r.sort((a, b) => {
      let va: number | string = a[sortKey] ?? 0
      let vb: number | string = b[sortKey] ?? 0
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      return sortDir === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va)
    })

    return r
  }, [registros, filtroSede, filtroCategoria, filtroDesde, filtroHasta, busqueda, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function limpiarFiltros() {
    setFiltroAnio('Todos'); setFiltroEstado('Todos'); setFiltroSede('Todos')
    setFiltroCategoria('Todos'); setFiltroDesde(''); setFiltroHasta(''); setBusqueda('')
  }

  const hayFiltros = filtroAnio !== 'Todos' || filtroEstado !== 'Todos' || filtroSede !== 'Todos' ||
    filtroCategoria !== 'Todos' || filtroDesde || filtroHasta || busqueda.trim()

  async function sendToReview(id: string) {
    setSendingId(id)
    const { error } = await supabase.from('registros_datos')
      .update({ estado: 'en_revision', revisado_por: null, revisado_en: null } as never).eq('id', id)
    if (!error) {
      setRegistros(prev => prev.map(r => r.id === id ? { ...r, estado: 'en_revision' } : r))
      await registrarAuditoria({
        empresaId, usuarioId: user?.id ?? null, accion: 'en_revision',
        tabla: 'registros_datos', registroId: id,
      })
    }
    setSendingId(null)
  }

  async function eliminar(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('registros_datos').delete().eq('id', id)
    if (!error) setRegistros(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
    setConfirmModal(null)
  }

  const totalCO2 = filtered.reduce((s, r) => s + (r.co2_calculado ?? 0), 0)

  const SortBtn = ({ col }: { col: SortKey }) => (
    <span style={{ cursor: 'pointer', marginLeft: 4, opacity: sortKey === col ? 1 : 0.4 }}
      onClick={() => toggleSort(col)}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} />
      {confirmModal && (
        <ModalConfirmacion
          titulo="Eliminar registro"
          mensaje={confirmModal.estado === 'aprobado'
            ? 'Este registro está APROBADO. Eliminarlo afectará las cifras de CO₂ en reportes. ¿Confirmar eliminación permanente?'
            : '¿Eliminar este registro? Esta acción no se puede deshacer.'}
          tipo={confirmModal.estado === 'aprobado' ? 'danger' : 'warning'}
          onConfirmar={() => eliminar(confirmModal.id)}
          onCancelar={() => setConfirmModal(null)}
          cargando={deletingId === confirmModal.id}
        />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Registros" email={user?.email}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Registros' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {/* Encabezado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Registros de datos</h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                Mostrando <strong>{filtered.length}</strong> de <strong>{registros.length}</strong> registros
                {totalCO2 > 0 && <> · <strong>{totalCO2.toFixed(3)} tCO₂e</strong> total</>}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {exportMsg && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{exportMsg}</span>}
              <button
                onClick={handleExportarCSV}
                disabled={exportando || !empresaId}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1.5px solid #16a34a',
                  background: '#fff', color: '#16a34a', fontSize: 14, fontWeight: 600,
                  cursor: exportando ? 'not-allowed' : 'pointer', opacity: exportando ? 0.7 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                <DownloadIcon size={15} />
                {exportando ? 'Exportando…' : 'Exportar CSV'}
              </button>
              <Link href="/registros/nuevo" style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#16a34a,#15803d)',
                color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                + Nuevo registro
              </Link>
            </div>
          </div>

          {/* Panel de filtros */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {/* Búsqueda */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Buscar indicador</label>
                <input style={inp} value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre o código de indicador…" />
              </div>

              {/* Año */}
              <div>
                <label style={lbl}>Año</label>
                <select style={inp} value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}>
                  <option value="Todos">Todos</option>
                  {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label style={lbl}>Estado</label>
                <select style={inp} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="Todos">Todos</option>
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>{e === 'en_revision' ? 'En revisión' : e.charAt(0).toUpperCase() + e.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Sede */}
              <div>
                <label style={lbl}>Sede</label>
                <select style={inp} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                  <option value="Todos">Todas</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label style={lbl}>Categoría</label>
                <select style={inp} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                  <option value="Todos">Todas</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>

              {/* Desde */}
              <div>
                <label style={lbl}>Desde</label>
                <input type="date" style={inp} value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
              </div>

              {/* Hasta */}
              <div>
                <label style={lbl}>Hasta</label>
                <input type="date" style={inp} value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
              </div>
            </div>

            {hayFiltros && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={limpiarFiltros} style={{ fontSize: 12, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
                  ✕ Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* Tabla */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando registros…</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ marginBottom: 12 }}><FileTextIcon size={44} color="#cbd5e1" /></div>
                  <p style={{ margin: 0, fontSize: 14 }}>
                    {hayFiltros ? 'No hay registros con estos filtros.' : 'No hay registros aún.'}
                  </p>
                  {!hayFiltros && (
                    <Link href="/registros/nuevo" style={{ display: 'inline-block', marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#16a34a', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                      Crear primer registro
                    </Link>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={th}>Sede</th>
                        <th style={th}>Indicador</th>
                        <th style={th}>Categoría</th>
                        <th style={{ ...th, cursor: 'pointer' }} onClick={() => toggleSort('valor')}>
                          Valor <SortBtn col="valor" />
                        </th>
                        <th style={{ ...th, cursor: 'pointer' }} onClick={() => toggleSort('co2_calculado')}>
                          tCO₂e <SortBtn col="co2_calculado" />
                        </th>
                        <th style={{ ...th, cursor: 'pointer' }} onClick={() => toggleSort('anio')}>
                          Período <SortBtn col="anio" />
                        </th>
                        <th style={{ ...th, cursor: 'pointer' }} onClick={() => toggleSort('estado')}>
                          Estado <SortBtn col="estado" />
                        </th>
                        <th style={th}>Acciones</th>
                        <th style={{ ...th, cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>
                          Fecha <SortBtn col="created_at" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(r => {
                        const ind = r.indicadores as { codigo: string; nombre: string; unidad: string; categoria: string | null } | undefined
                        const sede = r.sedes as { nombre: string } | undefined
                        const catColor: Record<string, string> = { energia: '#b45309', agua: '#1d4ed8', residuos: '#7e22ce', emisiones: '#dc2626' }

                        return (
                          <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={td}>{sede?.nombre ?? '—'}</td>
                            <td style={td}>
                              <div style={{ fontWeight: 600, color: '#16a34a', fontSize: 12 }}>{ind?.codigo}</div>
                              <div style={{ fontSize: 12, color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind?.nombre}</div>
                            </td>
                            <td style={td}>
                              {ind?.categoria && (
                                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: `${catColor[ind.categoria]}18`, color: catColor[ind.categoria] ?? '#64748b', border: `1px solid ${catColor[ind.categoria]}30` }}>
                                  {ind.categoria.charAt(0).toUpperCase() + ind.categoria.slice(1)}
                                </span>
                              )}
                            </td>
                            <td style={td}>{r.valor.toLocaleString('es-CO')} <span style={{ color: '#94a3b8', fontSize: 11 }}>{ind?.unidad}</span></td>
                            <td style={td}>
                              {r.co2_calculado != null
                                ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{r.co2_calculado.toFixed(4)}</span>
                                : '—'}
                            </td>
                            <td style={td}>{r.mes ? `${MESES[r.mes]} ${r.anio}` : r.anio}</td>
                            <td style={td}><EstadoBadge estado={r.estado} /></td>
                            <td style={td}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <Link href={`/registros/${r.id}`} style={aBtn}>Ver</Link>
                                {r.estado === 'borrador' && (
                                  <button onClick={() => sendToReview(r.id)} disabled={sendingId === r.id} style={aBtn2}>
                                    {sendingId === r.id ? '…' : 'Revisar'}
                                  </button>
                                )}
                                {(r.estado === 'borrador' || r.estado === 'rechazado' || r.estado === 'aprobado') && (
                                  <button onClick={() => setConfirmModal({ id: r.id, estado: r.estado })} style={aBtn3}>
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ ...td, whiteSpace: 'nowrap' }}>
                              {new Date(r.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', userSelect: 'none' }
const td: React.CSSProperties = { padding: '11px 14px', fontSize: 13, color: '#374151' }
const aBtn: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '4px 10px', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' }
const aBtn2: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#fff', background: '#16a34a', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }
const aBtn3: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }
