'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

interface Empresa     { id: string; nombre: string }
interface Sede        { id: string; empresa_id: string; nombre: string; ciudad: string | null; pais: string | null; created_at: string; empresas?: { nombre: string } }
interface Instalacion { id: string; sede_id: string; nombre: string; tipo: string | null; created_at: string }
interface User        { id: string; email?: string }

export default function SedesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser]             = useState<User | null>(null)
  const [empresas, setEmpresas]     = useState<Empresa[]>([])
  const [sedes, setSedes]           = useState<Sede[]>([])
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [showSedeForm, setShowSedeForm]   = useState(false)
  const [showInstForm, setShowInstForm]   = useState<string | null>(null) // sede_id activo
  const [saving, setSaving]         = useState(false)

  // Sede form
  const [sNombre, setSNombre] = useState('')
  const [sCiudad, setSCiudad] = useState('')
  const [sPais,   setSPais]   = useState('Colombia')
  const [sEmpId,  setSEmpId]  = useState('')

  // Instalación form
  const [iNombre, setINombre] = useState('')
  const [iTipo,   setITipo]   = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [empRes, sedRes] = await Promise.all([
        supabase.from('empresas').select('id, nombre').eq('user_id', user.id).order('nombre'),
        supabase.from('sedes').select('id, empresa_id, nombre, ciudad, pais, created_at, empresas(nombre)').order('created_at', { ascending: false }),
      ])

      if (empRes.data) { setEmpresas(empRes.data); if (empRes.data[0]) setSEmpId(empRes.data[0].id) }
      if (sedRes.data) setSedes(sedRes.data as unknown as Sede[])
      if (sedRes.error) setError(sedRes.error.message)

      // Cargar instalaciones de todas las sedes
      if (sedRes.data && sedRes.data.length > 0) {
        const sedeIds = sedRes.data.map(s => s.id)
        const { data: inst } = await supabase
          .from('instalaciones')
          .select('id, sede_id, nombre, tipo, created_at')
          .in('sede_id', sedeIds)
          .order('created_at', { ascending: false })
        setInstalaciones(inst ?? [])
      }

      setLoading(false)
    }
    load()
  }, [supabase])

  const handleCreateSede = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sEmpId) { setError('Selecciona una empresa'); return }
    setSaving(true); setError(null)
    const { data, error } = await supabase
      .from('sedes')
      .insert({ nombre: sNombre, ciudad: sCiudad, pais: sPais, empresa_id: sEmpId } as never)
      .select('id, empresa_id, nombre, ciudad, pais, created_at, empresas(nombre)')
      .single()
    if (error) setError(error.message)
    else {
      setSedes(prev => [data as unknown as Sede, ...prev])
      setShowSedeForm(false); setSNombre(''); setSCiudad(''); setSPais('Colombia')
    }
    setSaving(false)
  }

  const handleCreateInstalacion = async (e: React.FormEvent, sedeId: string) => {
    e.preventDefault()
    setSaving(true); setError(null)
    const { data, error } = await supabase
      .from('instalaciones')
      .insert({ nombre: iNombre, tipo: iTipo || null, sede_id: sedeId } as never)
      .select('id, sede_id, nombre, tipo, created_at')
      .single()
    if (error) setError(error.message)
    else {
      setInstalaciones(prev => [data as Instalacion, ...prev])
      setShowInstForm(null); setINombre(''); setITipo('')
    }
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Sedes" email={user?.email}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Sedes' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando sedes…</div>
          ) : (
            <>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Sedes</h2>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>{sedes.length} sede{sedes.length !== 1 ? 's' : ''} registrada{sedes.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowSedeForm(v => !v)} style={btnPrimary}>
                  {showSedeForm ? '✕ Cancelar' : '+ Nueva sede'}
                </button>
              </div>

              {/* Form nueva sede */}
              {showSedeForm && (
                <div style={card}>
                  <h3 style={cardTitle}>Crear sede</h3>
                  {empresas.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: 14 }}>
                      Primero <a href="/empresas" style={{ color: '#16a34a', fontWeight: 600 }}>registra una empresa</a>.
                    </p>
                  ) : (
                    <form onSubmit={handleCreateSede} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={lbl}>Empresa *</label>
                        <select style={inp} value={sEmpId} onChange={e => setSEmpId(e.target.value)} required>
                          {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Nombre de la sede *</label>
                        <input style={inp} value={sNombre} onChange={e => setSNombre(e.target.value)} required placeholder="Sede principal" />
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
                        <button type="button" onClick={() => setShowSedeForm(false)} style={btnSecondary}>Cancelar</button>
                        <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Guardando…' : 'Crear sede'}</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Lista de sedes con instalaciones */}
              {sedes.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>📍</div>
                  <p style={{ margin: 0, fontSize: 14 }}>No hay sedes registradas aún.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sedes.map(s => {
                    const instsSede = instalaciones.filter(i => i.sede_id === s.id)
                    const emp = (s.empresas as { nombre: string } | undefined)?.nombre
                    return (
                      <div key={s.id} style={card}>
                        {/* Sede header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{s.nombre}</h3>
                              {s.ciudad && <span style={badge}>{s.ciudad}</span>}
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                              {emp && `${emp} · `}{s.pais ?? 'Colombia'} · {new Date(s.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowInstForm(showInstForm === s.id ? null : s.id)}
                            style={{ ...btnSecondary, fontSize: 12 }}
                          >
                            {showInstForm === s.id ? '✕ Cancelar' : '+ Instalación'}
                          </button>
                        </div>

                        {/* Form nueva instalación */}
                        {showInstForm === s.id && (
                          <form onSubmit={e => handleCreateInstalacion(e, s.id)}
                            style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '14px', background: '#f8fafc', borderRadius: 10, marginBottom: 12, border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 2 }}>
                              <label style={lbl}>Nombre instalación *</label>
                              <input style={inp} value={iNombre} onChange={e => setINombre(e.target.value)} required placeholder="Planta de producción" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={lbl}>Tipo</label>
                              <input style={inp} value={iTipo} onChange={e => setITipo(e.target.value)} placeholder="Almacén, oficina…" />
                            </div>
                            <button type="submit" disabled={saving} style={{ ...btnPrimary, height: 40, opacity: saving ? 0.7 : 1 }}>
                              {saving ? '…' : 'Agregar'}
                            </button>
                          </form>
                        )}

                        {/* Instalaciones */}
                        {instsSede.length > 0 && (
                          <div>
                            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Instalaciones ({instsSede.length})
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {instsSede.map(inst => (
                                <div key={inst.id} style={{ padding: '6px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#15803d' }}>
                                  <strong>{inst.nombre}</strong>
                                  {inst.tipo && <span style={{ color: '#86efac', marginLeft: 6 }}>· {inst.tipo}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {instsSede.length === 0 && (
                          <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>Sin instalaciones — usa el botón para agregar.</p>
                        )}
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

const lbl: React.CSSProperties  = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inp: React.CSSProperties  = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
const card: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const cardTitle: React.CSSProperties = { margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: '#0f172a' }
const badge: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
const errBox: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }
const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
