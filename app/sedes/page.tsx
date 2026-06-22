'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ModalConfirmacion from '@/components/ModalConfirmacion'
import { MapPinIcon, PencilIcon, TrashIcon, FactoryIcon, FileTextIcon, WindIcon } from '@/components/Icons'

interface Empresa     { id: string; nombre: string }
interface Sede        { id: string; empresa_id: string; nombre: string; ciudad: string | null; pais: string | null; created_at: string; empresas?: { nombre: string } }
interface Instalacion { id: string; sede_id: string; nombre: string; tipo: string | null }
interface SedeStats   { sede_id: string; totalRegistros: number; totalCO2: number; ultimaActividad: string | null }

const TIPOS_INSTALACION = ['Planta industrial', 'Oficina', 'Bodega', 'Laboratorio', 'Flota vehicular', 'Centro de datos', 'Comercio', 'Otro']

export default function SedesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser]         = useState<{ id: string; email?: string } | null>(null)
  const [perfil, setPerfil]     = useState<{ nombre: string | null; rol: string; empresa_id: string | null } | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [sedes, setSedes]       = useState<Sede[]>([])
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [sedeStats, setSedeStats] = useState<Record<string, SedeStats>>({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // Formulario sede
  const [modalSede, setModalSede]   = useState<'crear' | 'editar' | null>(null)
  const [editandoSede, setEditandoSede] = useState<Sede | null>(null)
  const [sNombre, setSNombre]       = useState('')
  const [sCiudad, setSCiudad]       = useState('')
  const [sPais, setSPais]           = useState('Colombia')
  const [sEmpId, setSEmpId]         = useState('')
  const [savingSede, setSavingSede] = useState(false)

  // Formulario instalación
  const [modalInst, setModalInst]   = useState<string | null>(null) // sede_id
  const [editandoInst, setEditandoInst] = useState<Instalacion | null>(null)
  const [iNombre, setINombre]       = useState('')
  const [iTipo, setITipo]           = useState('')
  const [savingInst, setSavingInst] = useState(false)

  // Confirmación eliminar
  const [confirmElimSede, setConfirmElimSede] = useState<Sede | null>(null)

  // Sede expandida para ver detalle
  const [sedeExpandida, setSedeExpandida] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data: p } = await supabase.from('perfiles').select('nombre, rol, empresa_id').eq('user_id', user.id).single()
      setPerfil(p)

      const empId = p?.empresa_id
      const [empRes, sedRes] = await Promise.all([
        supabase.from('empresas').select('id, nombre').eq('user_id', user.id).order('nombre'),
        empId
          ? supabase.from('sedes').select('id, empresa_id, nombre, ciudad, pais, created_at, empresas(nombre)').eq('empresa_id', empId).order('nombre')
          : supabase.from('sedes').select('id, empresa_id, nombre, ciudad, pais, created_at, empresas(nombre)').order('nombre'),
      ])

      const sedesData = (sedRes.data ?? []) as unknown as Sede[]
      if (empRes.data) { setEmpresas(empRes.data); if (empRes.data[0] && !empId) setSEmpId(empRes.data[0].id) }
      if (empId) setSEmpId(empId)
      setSedes(sedesData)

      if (sedesData.length > 0) {
        const sedeIds = sedesData.map(s => s.id)

        const { data: inst } = await supabase
          .from('instalaciones')
          .select('id, sede_id, nombre, tipo')
          .in('sede_id', sedeIds)
        setInstalaciones(inst ?? [])

        // Stats por sede
        const { data: regs } = await supabase
          .from('registros_datos')
          .select('sede_id, co2_calculado, created_at')
          .in('sede_id', sedeIds)
          .in('estado', ['aprobado', 'publicado'])

        const statsMap: Record<string, SedeStats> = {}
        sedeIds.forEach(id => { statsMap[id] = { sede_id: id, totalRegistros: 0, totalCO2: 0, ultimaActividad: null } })
        ;(regs ?? []).forEach(r => {
          if (!r.sede_id) return
          statsMap[r.sede_id].totalRegistros++
          statsMap[r.sede_id].totalCO2 += r.co2_calculado ?? 0
          if (!statsMap[r.sede_id].ultimaActividad || r.created_at > statsMap[r.sede_id].ultimaActividad!) {
            statsMap[r.sede_id].ultimaActividad = r.created_at
          }
        })
        setSedeStats(statsMap)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  function abrirCrearSede() {
    setEditandoSede(null)
    setSNombre(''); setSCiudad(''); setSPais('Colombia')
    setSEmpId(perfil?.empresa_id ?? empresas[0]?.id ?? '')
    setModalSede('crear')
  }

  function abrirEditarSede(s: Sede) {
    setEditandoSede(s)
    setSNombre(s.nombre); setSCiudad(s.ciudad ?? ''); setSPais(s.pais ?? 'Colombia'); setSEmpId(s.empresa_id)
    setModalSede('editar')
  }

  async function guardarSede(e: React.FormEvent) {
    e.preventDefault()
    setSavingSede(true); setError(null)
    if (editandoSede) {
      const { data, error } = await supabase.from('sedes')
        .update({ nombre: sNombre, ciudad: sCiudad, pais: sPais } as never)
        .eq('id', editandoSede.id)
        .select('id, empresa_id, nombre, ciudad, pais, created_at, empresas(nombre)')
        .single()
      if (error) setError(error.message)
      else setSedes(prev => prev.map(s => s.id === editandoSede.id ? data as unknown as Sede : s))
    } else {
      const { data, error } = await supabase.from('sedes')
        .insert({ nombre: sNombre, ciudad: sCiudad, pais: sPais, empresa_id: sEmpId } as never)
        .select('id, empresa_id, nombre, ciudad, pais, created_at, empresas(nombre)')
        .single()
      if (error) setError(error.message)
      else {
        setSedes(prev => [data as unknown as Sede, ...prev])
        setSedeStats(prev => ({ ...prev, [data.id]: { sede_id: data.id, totalRegistros: 0, totalCO2: 0, ultimaActividad: null } }))
      }
    }
    setSavingSede(false)
    setModalSede(null)
  }

  async function eliminarSede(s: Sede) {
    const { error } = await supabase.from('sedes').delete().eq('id', s.id)
    if (error) setError(error.message)
    else {
      setSedes(prev => prev.filter(x => x.id !== s.id))
      setInstalaciones(prev => prev.filter(i => i.sede_id !== s.id))
    }
    setConfirmElimSede(null)
  }

  function abrirCrearInst(sedeId: string) {
    setEditandoInst(null)
    setINombre(''); setITipo('')
    setModalInst(sedeId)
  }

  function abrirEditarInst(inst: Instalacion) {
    setEditandoInst(inst)
    setINombre(inst.nombre); setITipo(inst.tipo ?? '')
    setModalInst(inst.sede_id)
  }

  async function guardarInst(e: React.FormEvent) {
    e.preventDefault()
    if (!modalInst) return
    setSavingInst(true); setError(null)
    if (editandoInst) {
      const { data, error } = await supabase.from('instalaciones')
        .update({ nombre: iNombre, tipo: iTipo || null } as never)
        .eq('id', editandoInst.id)
        .select('id, sede_id, nombre, tipo').single()
      if (error) setError(error.message)
      else setInstalaciones(prev => prev.map(i => i.id === editandoInst.id ? data as Instalacion : i))
    } else {
      const { data, error } = await supabase.from('instalaciones')
        .insert({ nombre: iNombre, tipo: iTipo || null, sede_id: modalInst } as never)
        .select('id, sede_id, nombre, tipo').single()
      if (error) setError(error.message)
      else setInstalaciones(prev => [...prev, data as Instalacion])
    }
    setSavingInst(false)
    setModalInst(null)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} userName={perfil?.nombre ?? undefined} rol={perfil?.rol ?? 'viewer'} />

      {/* Modal Sede */}
      {modalSede && (
        <div onClick={() => setModalSede(null)} style={overlay}>
          <div onClick={e => e.stopPropagation()} style={modal}>
            <h3 style={modalTitle}>{modalSede === 'crear' ? 'Nueva sede' : 'Editar sede'}</h3>
            <form onSubmit={guardarSede} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {modalSede === 'crear' && empresas.length > 1 && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Empresa</label>
                  <select style={inp} value={sEmpId} onChange={e => setSEmpId(e.target.value)}>
                    {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                  </select>
                </div>
              )}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Nombre *</label>
                <input style={inp} value={sNombre} onChange={e => setSNombre(e.target.value)} required placeholder="Planta principal" />
              </div>
              <div>
                <label style={lbl}>Ciudad</label>
                <input style={inp} value={sCiudad} onChange={e => setSCiudad(e.target.value)} placeholder="Bogotá" />
              </div>
              <div>
                <label style={lbl}>País</label>
                <input style={inp} value={sPais} onChange={e => setSPais(e.target.value)} placeholder="Colombia" />
              </div>
              {error && <div style={{ gridColumn: '1/-1', ...errBox }}>{error}</div>}
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalSede(null)} style={btnSec}>Cancelar</button>
                <button type="submit" disabled={savingSede} style={{ ...btnPrim, opacity: savingSede ? 0.7 : 1 }}>
                  {savingSede ? 'Guardando…' : modalSede === 'crear' ? 'Crear sede' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Instalación */}
      {modalInst && (
        <div onClick={() => setModalInst(null)} style={overlay}>
          <div onClick={e => e.stopPropagation()} style={{ ...modal, maxWidth: 440 }}>
            <h3 style={modalTitle}>{editandoInst ? 'Editar instalación' : 'Nueva instalación'}</h3>
            <form onSubmit={guardarInst} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input style={inp} value={iNombre} onChange={e => setINombre(e.target.value)} required placeholder="Planta de producción" />
              </div>
              <div>
                <label style={lbl}>Tipo</label>
                <select style={inp} value={iTipo} onChange={e => setITipo(e.target.value)}>
                  <option value="">Sin especificar</option>
                  {TIPOS_INSTALACION.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {error && <div style={errBox}>{error}</div>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalInst(null)} style={btnSec}>Cancelar</button>
                <button type="submit" disabled={savingInst} style={{ ...btnPrim, opacity: savingInst ? 0.7 : 1 }}>
                  {savingInst ? 'Guardando…' : editandoInst ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmElimSede && (
        <ModalConfirmacion
          titulo="Eliminar sede"
          mensaje={`¿Eliminar la sede "${confirmElimSede.nombre}"? Se eliminarán todas sus instalaciones.`}
          tipo="danger"
          onConfirmar={() => eliminarSede(confirmElimSede)}
          onCancelar={() => setConfirmElimSede(null)}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Sedes" email={user?.email}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Sedes' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando sedes…</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Sedes y ubicaciones</h2>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                    {sedes.length} sede{sedes.length !== 1 ? 's' : ''} · {instalaciones.length} instalación{instalaciones.length !== 1 ? 'es' : ''}
                  </p>
                </div>
                <button onClick={abrirCrearSede} style={btnPrim}>+ Nueva sede</button>
              </div>

              {sedes.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ marginBottom: 12 }}><MapPinIcon size={44} color="#cbd5e1" /></div>
                  <p style={{ margin: '0 0 16px', fontSize: 14 }}>No hay sedes registradas aún.</p>
                  <button onClick={abrirCrearSede} style={btnPrim}>+ Crear primera sede</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                  {sedes.map(s => {
                    const instsSede = instalaciones.filter(i => i.sede_id === s.id)
                    const stats = sedeStats[s.id]
                    const emp = (s.empresas as { nombre: string } | undefined)?.nombre
                    const expandida = sedeExpandida === s.id

                    return (
                      <div key={s.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
                        {/* Header de card */}
                        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '18px 20px', color: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{s.nombre}</h3>
                              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPinIcon size={11} color="#94a3b8" />
                                {[s.ciudad, s.pais].filter(Boolean).join(', ') || 'Sin ubicación'}
                                {emp && ` · ${emp}`}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => abrirEditarSede(s)} style={iconBtn} title="Editar"><PencilIcon size={13} /></button>
                              <button onClick={() => setConfirmElimSede(s)} style={iconBtn} title="Eliminar"><TrashIcon size={13} /></button>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #f1f5f9' }}>
                          {[
                            { label: 'Instalaciones', value: instsSede.length,                    icon: <FactoryIcon  size={16} color="#64748b" /> },
                            { label: 'Registros',     value: stats?.totalRegistros ?? 0,          icon: <FileTextIcon size={16} color="#64748b" /> },
                            { label: 'tCO₂e',         value: (stats?.totalCO2 ?? 0).toFixed(2),  icon: <WindIcon     size={16} color="#64748b" /> },
                          ].map(({ label, value, icon }) => (
                            <div key={label} style={{ padding: '12px 16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{icon}</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{value}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Instalaciones expandibles */}
                        <div style={{ padding: '14px 20px' }}>
                          <button
                            onClick={() => setSedeExpandida(expandida ? null : s.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                          >
                            {expandida ? '▼' : '▶'} {instsSede.length === 0 ? 'Sin instalaciones' : `${instsSede.length} instalación${instsSede.length !== 1 ? 'es' : ''}`}
                          </button>

                          {expandida && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {instsSede.map(inst => (
                                <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                                  <div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>{inst.nombre}</span>
                                    {inst.tipo && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{inst.tipo}</span>}
                                  </div>
                                  <button onClick={() => abrirEditarInst(inst)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', display: 'flex' }} title="Editar"><PencilIcon size={13} /></button>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => abrirCrearInst(s.id)}
                            style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: '1.5px dashed #e2e8f0', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
                          >
                            + Agregar instalación
                          </button>

                          {stats?.ultimaActividad && (
                            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#cbd5e1' }}>
                              Última actividad: {new Date(stats.ultimaActividad).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
const btnPrim: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSec: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const iconBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }
const errBox: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }
const modal: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 540, boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }
const modalTitle: React.CSSProperties = { margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#0f172a' }
