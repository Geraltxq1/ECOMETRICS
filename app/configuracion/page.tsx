'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import RoleBadge from '@/components/RoleBadge'

interface Perfil   { id: string; user_id: string; nombre: string | null; email: string | null; rol: string; activo: boolean }
interface Empresa  { id: string; nombre: string; industria: string | null; ciudad: string | null; pais: string | null }
interface Codigo   { id: string; codigo: string; rol_asignado: string; usado: boolean; expira_en: string; created_at: string }

const ROLES_INV = ['editor', 'viewer', 'auditor', 'admin']
const SECTORES  = ['Manufactura', 'Servicios', 'Construcción', 'Transporte', 'Energía', 'Agricultura', 'Minería', 'Tecnología', 'Salud', 'Educación', 'Otro']

export default function ConfiguracionPage() {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser]       = useState<{ id: string; email?: string } | null>(null)
  const [perfil, setPerfil]   = useState<Perfil | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [miembros, setMiembros] = useState<Perfil[]>([])
  const [codigos, setCodigos]   = useState<Codigo[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Empresa form state
  const [empNombre, setEmpNombre]     = useState('')
  const [empIndustria, setEmpIndustria] = useState('')
  const [empCiudad, setEmpCiudad]     = useState('')
  const [empPais, setEmpPais]         = useState('Colombia')
  const [rolInv, setRolInv]           = useState('editor')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data: p } = await supabase
        .from('perfiles')
        .select('id, user_id, empresa_id, nombre, email, rol, activo')
        .eq('user_id', user.id)
        .single()

      if (!p || p.rol !== 'admin') {
        window.location.href = '/dashboard'
        return
      }
      setPerfil(p)

      const { data: emp } = await supabase
        .from('empresas')
        .select('id, nombre, industria, ciudad, pais')
        .eq('id', p.empresa_id ?? '')
        .single()

      if (emp) {
        setEmpresa(emp)
        setEmpNombre(emp.nombre ?? '')
        setEmpIndustria(emp.industria ?? '')
        setEmpCiudad(emp.ciudad ?? '')
        setEmpPais(emp.pais ?? 'Colombia')
      }

      // Cargar miembros del equipo
      if (p.empresa_id) {
        const { data: mems } = await supabase
          .from('perfiles')
          .select('id, user_id, nombre, email, rol, activo')
          .eq('empresa_id', p.empresa_id)

        setMiembros(mems ?? [])

        // Cargar códigos de invitación
        const { data: cods } = await supabase
          .from('codigos_invitacion')
          .select('id, codigo, rol_asignado, usado, expira_en, created_at')
          .eq('empresa_id', p.empresa_id)
          .order('created_at', { ascending: false })
          .limit(10)

        setCodigos(cods ?? [])
      }

      setLoading(false)
    }
    load()
  }, [supabase])

  const saveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresa) return
    setSaving(true); setError(null); setSuccess(null)

    const { error } = await supabase
      .from('empresas')
      .update({ nombre: empNombre, industria: empIndustria, ciudad: empCiudad, pais: empPais } as never)
      .eq('id', empresa.id)

    if (error) setError(error.message)
    else {
      setEmpresa(prev => prev ? { ...prev, nombre: empNombre, industria: empIndustria, ciudad: empCiudad, pais: empPais } : prev)
      setSuccess('Empresa actualizada correctamente.')
    }
    setSaving(false)
  }

  const generarCodigo = async () => {
    if (!empresa) return
    setGenerando(true); setError(null)
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const rand = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
    const codigo = `ECO-${new Date().getFullYear()}-${rand}`

    const { data, error } = await supabase
      .from('codigos_invitacion')
      .insert({
        empresa_id:   empresa.id,
        codigo,
        creado_por:   user?.id,
        rol_asignado: rolInv,
      } as never)
      .select()
      .single()

    if (error) setError(error.message)
    else setCodigos(prev => [data as Codigo, ...prev])
    setGenerando(false)
  }

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo)
    setCopiedCode(codigo)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const cambiarRol = async (perfilId: string, nuevoRol: string) => {
    const { error } = await supabase
      .from('perfiles')
      .update({ rol: nuevoRol } as never)
      .eq('id', perfilId)

    if (!error) setMiembros(prev => prev.map(m => m.id === perfilId ? { ...m, rol: nuevoRol } : m))
  }

  const toggleActivo = async (perfilId: string, activo: boolean) => {
    const { error } = await supabase
      .from('perfiles')
      .update({ activo: !activo } as never)
      .eq('id', perfilId)

    if (!error) setMiembros(prev => prev.map(m => m.id === perfilId ? { ...m, activo: !activo } : m))
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <Sidebar userEmail={user?.email} rol="admin" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Cargando configuración…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} userName={perfil?.nombre ?? undefined} empresa={empresa?.nombre} rol={perfil?.rol ?? 'admin'} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Configuración" email={user?.email} empresa={empresa?.nombre}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Configuración' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Configuración</h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>Gestiona tu empresa, códigos de invitación y equipo.</p>
            </div>

            {error && <div style={errBox}>{error}</div>}
            {success && <div style={sucBox}>{success}</div>}

            {/* ── Sección 1: Datos empresa ── */}
            <Section title="Datos de la empresa" icon="🏢">
              <form onSubmit={saveEmpresa} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Nombre de la empresa *</label>
                  <input style={inp} value={empNombre} onChange={e => setEmpNombre(e.target.value)} required placeholder="Nombre" />
                </div>
                <div>
                  <label style={lbl}>Industria</label>
                  <select style={inp} value={empIndustria} onChange={e => setEmpIndustria(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Ciudad</label>
                  <input style={inp} value={empCiudad} onChange={e => setEmpCiudad(e.target.value)} placeholder="Bogotá" />
                </div>
                <div>
                  <label style={lbl}>País</label>
                  <input style={inp} value={empPais} onChange={e => setEmpPais(e.target.value)} placeholder="Colombia" />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </Section>

            {/* ── Sección 2: Código de invitación ── */}
            <Section title="Código de invitación" icon="🔑">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <label style={lbl}>Rol a asignar</label>
                  <select style={{ ...inp, width: 'auto' }} value={rolInv} onChange={e => setRolInv(e.target.value)}>
                    {ROLES_INV.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button onClick={generarCodigo} disabled={generando} style={{ ...btnPrimary, opacity: generando ? 0.7 : 1 }}>
                    {generando ? 'Generando…' : '+ Generar código'}
                  </button>
                </div>
              </div>

              {codigos.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No hay códigos generados.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {codigos.map(c => {
                    const expirado = new Date(c.expira_en) < new Date()
                    return (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: 10,
                        background: c.usado || expirado ? '#f8fafc' : '#f0fdf4',
                        border: `1px solid ${c.usado || expirado ? '#e2e8f0' : '#bbf7d0'}`,
                        opacity: c.usado || expirado ? 0.65 : 1,
                      }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: 1 }}>
                            {c.codigo}
                          </span>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <RoleBadge rol={c.rol_asignado} size="sm" />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              Expira {new Date(c.expira_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {c.usado && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>• Usado</span>}
                            {expirado && !c.usado && <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>• Expirado</span>}
                          </div>
                        </div>
                        {!c.usado && !expirado && (
                          <button onClick={() => copiarCodigo(c.codigo)} style={btnSecondary}>
                            {copiedCode === c.codigo ? '✓ Copiado' : '📋 Copiar'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            {/* ── Sección 3: Equipo ── */}
            <Section title={`Equipo · ${miembros.length} miembros`} icon="👥">
              {miembros.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No hay miembros aún. Comparte un código de invitación.</p>
              ) : (
                <div style={{ overflow: 'hidden', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Miembro', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {miembros.map(m => (
                        <tr key={m.id} style={{ borderTop: '1px solid #f1f5f9', opacity: m.activo ? 1 : 0.55 }}>
                          <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>
                            {m.nombre ?? '—'}
                            {m.user_id === user?.id && (
                              <span style={{ fontSize: 10, color: '#16a34a', marginLeft: 6, fontWeight: 600 }}>TÚ</span>
                            )}
                          </td>
                          <td style={td}>{m.email ?? '—'}</td>
                          <td style={td}>
                            {m.user_id === user?.id
                              ? <RoleBadge rol={m.rol} />
                              : (
                                <select
                                  value={m.rol}
                                  onChange={e => cambiarRol(m.id, e.target.value)}
                                  style={{ ...inp, padding: '4px 8px', fontSize: 11, width: 'auto' }}
                                >
                                  {['admin', 'editor', 'viewer', 'auditor'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              )}
                          </td>
                          <td style={td}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                              background: m.activo ? '#f0fdf4' : '#f1f5f9',
                              color: m.activo ? '#16a34a' : '#94a3b8',
                              border: `1px solid ${m.activo ? '#bbf7d0' : '#e2e8f0'}`,
                            }}>
                              {m.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={td}>
                            {m.user_id !== user?.id && (
                              <button
                                onClick={() => toggleActivo(m.id, m.activo)}
                                style={{ ...btnSecondary, fontSize: 12, padding: '5px 10px', color: m.activo ? '#dc2626' : '#16a34a' }}
                              >
                                {m.activo ? 'Desactivar' : 'Activar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        </main>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>{title}
      </h3>
      {children}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
const th:  React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }
const td:  React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#374151' }
const btnPrimary: React.CSSProperties = { padding: '10px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const errBox: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 20 }
const sucBox: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, marginBottom: 20 }
