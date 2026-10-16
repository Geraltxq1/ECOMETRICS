'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import RoleBadge from '@/components/RoleBadge'
import ModalConfirmacion from '@/components/ModalConfirmacion'
import ToastStack, { ToastData } from '@/components/Toast'
import { getRolColor } from '@/lib/permissions'
import { BuildingIcon, KeyIcon, UsersIcon, CopyIcon, CheckIcon, TrashIcon, PlusIcon, XIcon } from '@/components/Icons'

interface Perfil   { id: string; user_id: string; nombre: string | null; email: string | null; rol: string; activo: boolean; created_at?: string }
interface Empresa  { id: string; nombre: string; industria: string | null; ciudad: string | null; pais: string | null }
interface Codigo   { id: string; codigo: string; rol_asignado: string; usado: boolean; usado_por?: string | null; expira_en: string; created_at: string }

const ROLES_INVITABLES = ['editor', 'viewer', 'auditor']
const ROLES_ASIGNABLES = ['admin', 'editor', 'viewer', 'auditor']
const SECTORES = ['Manufactura', 'Servicios', 'Construcción', 'Transporte', 'Energía', 'Agricultura', 'Minería', 'Tecnología', 'Salud', 'Educación', 'Otro']

type ModalAccion = { tipo: 'desactivar' | 'eliminar'; miembro: Perfil } | null

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
  const [nuevoCodigo, setNuevoCodigo] = useState<Codigo | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Acciones sobre miembros
  const [savingRolId, setSavingRolId]   = useState<string | null>(null)
  const [savingEstadoId, setSavingEstadoId] = useState<string | null>(null)
  const [modalAccion, setModalAccion]   = useState<ModalAccion>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Toasts
  const [toasts, setToasts] = useState<ToastData[]>([])
  const toastIdRef = useRef(0)
  const pushToast = (mensaje: string, tipo: ToastData['tipo'] = 'success') => {
    toastIdRef.current += 1
    setToasts(prev => [...prev, { id: toastIdRef.current, mensaje, tipo }])
  }
  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

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

      // Miembros y códigos se cargan vía API (usan el cliente admin en el
      // servidor: las políticas RLS de "perfiles"/"codigos_invitacion" solo
      // dejan ver todo a la empresa "propietaria", no a cualquier admin).
      const [resMiembros, resCodigos] = await Promise.all([
        fetch('/api/empresa/miembros'),
        fetch('/api/empresa/codigos'),
      ])

      if (resMiembros.ok) {
        const { data } = await resMiembros.json()
        setMiembros(data ?? [])
      }
      if (resCodigos.ok) {
        const { data } = await resCodigos.json()
        setCodigos(data ?? [])
      }

      setLoading(false)
    }
    load()
  }, [supabase])

  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
  }, [])

  const saveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresa) return
    setSaving(true); setError(null); setSuccess(null)

    const { error } = await supabase
      .from('empresas')
      .update({
        nombre: empNombre,
        industria: empIndustria,
        ciudad: empCiudad,
        pais: empPais,
      } as never)
      .eq('id', empresa.id)

    if (error) setError(error.message)
    else {
      setEmpresa(prev => prev ? { ...prev, nombre: empNombre, industria: empIndustria, ciudad: empCiudad, pais: empPais } : prev)
      setSuccess('Empresa actualizada correctamente.')
    }
    setSaving(false)
  }

  // ── Códigos de invitación ──────────────────────────────────────────
  const generarCodigo = async () => {
    if (!empresa) return
    setGenerando(true); setError(null)

    const res = await fetch('/api/empresa/generar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rolInv }),
    })
    const result = await res.json()

    if (!res.ok) {
      setError(result.error ?? 'Error al generar el código.')
      pushToast(result.error ?? 'Error al generar el código.', 'error')
    } else {
      const codigo = result.data as Codigo
      setCodigos(prev => [codigo, ...prev])
      setNuevoCodigo(codigo)
      pushToast('Código generado correctamente.')
    }
    setGenerando(false)
  }

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo)
    setCopiedCode(codigo)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopiedCode(null), 2000)
  }

  // ── Gestión de equipo ───────────────────────────────────────────────
  const totalAdmins    = useMemo(() => miembros.filter(m => m.rol === 'admin').length, [miembros])
  const adminsActivos  = useMemo(() => miembros.filter(m => m.rol === 'admin' && m.activo).length, [miembros])

  const cambiarRol = async (miembro: Perfil, nuevoRol: string) => {
    if (nuevoRol === miembro.rol) return
    setSavingRolId(miembro.id); setError(null)

    const res = await fetch(`/api/empresa/miembros/${miembro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: nuevoRol }),
    })
    const result = await res.json()

    if (!res.ok) {
      pushToast(result.error ?? 'Error al cambiar el rol.', 'error')
    } else {
      setMiembros(prev => prev.map(m => m.id === miembro.id ? { ...m, rol: nuevoRol } : m))
      pushToast('Rol actualizado correctamente')
    }
    setSavingRolId(null)
  }

  const activarMiembro = async (miembro: Perfil) => {
    setSavingEstadoId(miembro.id); setError(null)

    const res = await fetch(`/api/empresa/miembros/${miembro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: true }),
    })
    const result = await res.json()

    if (!res.ok) {
      pushToast(result.error ?? 'Error al activar al miembro.', 'error')
    } else {
      setMiembros(prev => prev.map(m => m.id === miembro.id ? { ...m, activo: true } : m))
      pushToast(`${miembro.nombre ?? 'Miembro'} activado correctamente`)
    }
    setSavingEstadoId(null)
  }

  const confirmarDesactivar = async () => {
    if (!modalAccion || modalAccion.tipo !== 'desactivar') return
    const miembro = modalAccion.miembro
    setModalLoading(true)

    const res = await fetch(`/api/empresa/miembros/${miembro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: false }),
    })
    const result = await res.json()

    if (!res.ok) {
      pushToast(result.error ?? 'Error al desactivar al miembro.', 'error')
    } else {
      setMiembros(prev => prev.map(m => m.id === miembro.id ? { ...m, activo: false } : m))
      pushToast(`${miembro.nombre ?? 'Miembro'} desactivado correctamente`)
    }
    setModalLoading(false)
    setModalAccion(null)
  }

  const confirmarEliminar = async () => {
    if (!modalAccion || modalAccion.tipo !== 'eliminar') return
    const miembro = modalAccion.miembro
    setModalLoading(true)

    const res = await fetch(`/api/empresa/miembros/${miembro.id}`, { method: 'DELETE' })
    const result = await res.json().catch(() => ({}))

    if (!res.ok) {
      pushToast(result.error ?? 'Error al eliminar al miembro.', 'error')
    } else {
      setMiembros(prev => prev.filter(m => m.id !== miembro.id))
      pushToast(`${miembro.nombre ?? 'Miembro'} eliminado del proyecto`)
    }
    setModalLoading(false)
    setModalAccion(null)
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
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {modalAccion && (
        <ModalConfirmacion
          tipo={modalAccion.tipo === 'eliminar' ? 'danger' : 'warning'}
          cargando={modalLoading}
          titulo={
            modalAccion.tipo === 'desactivar'
              ? `¿Desactivar a ${modalAccion.miembro.nombre ?? modalAccion.miembro.email ?? 'este usuario'}?`
              : `¿Eliminar a ${modalAccion.miembro.nombre ?? modalAccion.miembro.email ?? 'este usuario'} del proyecto?`
          }
          mensaje={
            modalAccion.tipo === 'desactivar'
              ? 'Ya no podrá acceder a la plataforma. Podrás reactivarlo cuando quieras.'
              : 'Sus registros se mantendrán pero perderá el acceso. Esta acción no se puede deshacer.'
          }
          onCancelar={() => { if (!modalLoading) setModalAccion(null) }}
          onConfirmar={() => modalAccion.tipo === 'desactivar' ? confirmarDesactivar() : confirmarEliminar()}
        />
      )}

      <Sidebar userEmail={user?.email} userName={perfil?.nombre ?? undefined} empresa={empresa?.nombre} rol={perfil?.rol ?? 'admin'} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Configuración" email={user?.email} empresa={empresa?.nombre}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Configuración' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          <div style={{ maxWidth: 880 }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Configuración</h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>Gestiona tu equipo, códigos de invitación y datos de la empresa.</p>
            </div>

            {error && <div style={errBox}>{error}</div>}
            {success && <div style={sucBox}>{success}</div>}

            {/* ── Sección 1: Equipo ── */}
            <Section title={`Equipo · ${miembros.length} miembro${miembros.length === 1 ? '' : 's'}`} icon={<UsersIcon size={16} />}>
              {miembros.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No hay miembros aún. Comparte un código de invitación.</p>
              ) : (
                <div style={{ overflow: 'hidden', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Miembro', 'Rol', 'Estado', 'Acciones'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {miembros.map(m => {
                        const esYo = m.user_id === user?.id
                        const esUltimoAdmin = m.rol === 'admin' && totalAdmins <= 1
                        const esUltimoAdminActivo = m.rol === 'admin' && m.activo && adminsActivos <= 1
                        const rolDisabled = esYo || esUltimoAdmin || savingRolId === m.id
                        const desactivarDisabled = esYo || esUltimoAdminActivo || savingEstadoId === m.id
                        const eliminarDisabled = esYo || esUltimoAdmin
                        const color = getRolColor(m.rol)
                        const inicial = (m.nombre?.trim()?.[0] ?? m.email?.trim()?.[0] ?? '?').toUpperCase()

                        return (
                          <tr key={m.id} style={{ borderTop: '1px solid #f1f5f9', opacity: m.activo ? 1 : 0.6 }}>
                            <td style={{ ...td, minWidth: 220 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: `${color}1A`, color, border: `1px solid ${color}33`,
                                  fontSize: 13, fontWeight: 700,
                                }}>
                                  {inicial}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {m.nombre ?? '—'}
                                    {esYo && <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>TÚ</span>}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.email ?? '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={td}>
                              {esYo ? (
                                <RoleBadge rol={m.rol} />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <select
                                    value={m.rol}
                                    disabled={rolDisabled}
                                    onChange={e => cambiarRol(m, e.target.value)}
                                    title={esUltimoAdmin ? 'Debe existir al menos un administrador' : undefined}
                                    style={{ ...inp, padding: '4px 8px', fontSize: 11, width: 'auto', opacity: rolDisabled ? 0.6 : 1 }}
                                  >
                                    {ROLES_ASIGNABLES.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                  {savingRolId === m.id && <Spinner />}
                                </div>
                              )}
                            </td>
                            <td style={td}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                                background: m.activo ? '#f0fdf4' : '#fef2f2',
                                color: m.activo ? '#16a34a' : '#dc2626',
                                border: `1px solid ${m.activo ? '#bbf7d0' : '#fecaca'}`,
                              }}>
                                {m.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td style={td}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => m.activo
                                    ? setModalAccion({ tipo: 'desactivar', miembro: m })
                                    : activarMiembro(m)}
                                  disabled={m.activo ? desactivarDisabled : (esYo || savingEstadoId === m.id)}
                                  title={m.activo && esUltimoAdminActivo ? 'Debe existir al menos un administrador activo' : undefined}
                                  style={{
                                    ...btnSecondary, fontSize: 12, padding: '5px 10px',
                                    color: m.activo ? '#dc2626' : '#16a34a',
                                    opacity: (m.activo ? desactivarDisabled : (esYo || savingEstadoId === m.id)) ? 0.5 : 1,
                                  }}
                                >
                                  {savingEstadoId === m.id ? 'Guardando…' : m.activo ? 'Desactivar' : 'Activar'}
                                </button>
                                <button
                                  onClick={() => setModalAccion({ tipo: 'eliminar', miembro: m })}
                                  disabled={eliminarDisabled}
                                  title={esUltimoAdmin ? 'Debe existir al menos un administrador' : 'Eliminar del proyecto'}
                                  style={{
                                    ...btnSecondary, fontSize: 12, padding: '5px 8px', color: '#dc2626',
                                    opacity: eliminarDisabled ? 0.5 : 1, display: 'flex', alignItems: 'center',
                                  }}
                                >
                                  <TrashIcon size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </Section>

            {/* ── Sección 2: Códigos de invitación ── */}
            <Section title="Códigos de invitación" icon={<KeyIcon size={16} />}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
                <div>
                  <label style={lbl}>Rol para el invitado</label>
                  <select style={{ ...inp, width: 'auto' }} value={rolInv} onChange={e => setRolInv(e.target.value)}>
                    {ROLES_INVITABLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button onClick={generarCodigo} disabled={generando} style={{ ...btnPrimary, opacity: generando ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PlusIcon size={13} /> {generando ? 'Generando…' : 'Generar código'}
                </button>
              </div>

              {nuevoCodigo && (
                <div style={{
                  position: 'relative', marginBottom: 20, padding: '18px 20px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1.5px solid #86efac',
                }}>
                  <button
                    onClick={() => setNuevoCodigo(null)}
                    aria-label="Cerrar"
                    style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'transparent', color: '#16a34a', cursor: 'pointer', opacity: 0.6, display: 'flex' }}
                  >
                    <XIcon size={14} />
                  </button>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Código generado
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: 2 }}>
                        {nuevoCodigo.codigo}
                      </div>
                      <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>
                        Rol: {nuevoCodigo.rol_asignado} · Expira el {new Date(nuevoCodigo.expira_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <button onClick={() => copiarCodigo(nuevoCodigo.codigo)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {copiedCode === nuevoCodigo.codigo
                        ? <><CheckIcon size={13} /> ¡Copiado!</>
                        : <><CopyIcon size={13} /> Copiar al portapapeles</>}
                    </button>
                  </div>
                </div>
              )}

              {codigos.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No hay códigos generados.</p>
              ) : (
                <div style={{ overflow: 'hidden', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Código', 'Rol', 'Estado', 'Creado', 'Expira', ''].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {codigos.map(c => {
                        const expirado = new Date(c.expira_en) < new Date()
                        const vigente = !c.usado && !expirado
                        return (
                          <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9', opacity: vigente ? 1 : 0.65 }}>
                            <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', letterSpacing: 0.5 }}>
                              {c.codigo}
                            </td>
                            <td style={td}><RoleBadge rol={c.rol_asignado} size="sm" /></td>
                            <td style={td}>
                              {c.usado ? (
                                <span style={{ ...estadoTag, background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }}>Usado</span>
                              ) : expirado ? (
                                <span style={{ ...estadoTag, background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>Expirado</span>
                              ) : (
                                <span style={{ ...estadoTag, background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>Vigente</span>
                              )}
                            </td>
                            <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                              {new Date(c.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                              {new Date(c.expira_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={td}>
                              {vigente && (
                                <button onClick={() => copiarCodigo(c.codigo)} style={{ ...btnSecondary, fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  {copiedCode === c.codigo
                                    ? <><CheckIcon size={12} /> Copiado</>
                                    : <><CopyIcon size={12} /> Copiar</>}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </Section>

            {/* ── Sección 3: Datos de la empresa ── */}
            <Section title="Datos de la empresa" icon={<BuildingIcon size={16} />}>
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
          </div>
        </main>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#64748b', display: 'flex' }}>{icon}</span>{title}
      </h3>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <>
      <span style={{ width: 13, height: 13, border: '2px solid #e2e8f0', borderTopColor: '#16a34a', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
const th:  React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }
const td:  React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#374151' }
const estadoTag: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, border: '1px solid' }
const btnPrimary: React.CSSProperties = { padding: '10px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const errBox: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 20 }
const sucBox: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, marginBottom: 20 }
