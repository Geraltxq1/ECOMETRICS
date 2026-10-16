'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import RoleBadge from '@/components/RoleBadge'
import type { Perfil } from '@/lib/types'
import { UserIcon, LockIcon, ClipboardIcon, PencilIcon, SendIcon, CheckCircleIcon, XCircleIcon } from '@/components/Icons'

interface EmpresaBasica { id: string; nombre: string }
interface AuditLog {
  id: string; accion: string; tabla: string | null
  registro_id: string | null; created_at: string
}
interface RegistroDatoActividad {
  id: string; valor: number; mes: number | null; anio: number
  indicadores?: { codigo: string; nombre: string; unidad: string; categoria: string | null }
}

const ACCION_INFO: Record<string, { color: string; label: string }> = {
  creado:      { color: '#64748b', label: 'Creaste un nuevo registro' },
  en_revision: { color: '#d97706', label: 'Enviaste a revisión' },
  aprobado:    { color: '#16a34a', label: 'Aprobaste un registro' },
  rechazado:   { color: '#dc2626', label: 'Rechazaste un registro' },
  publicado:   { color: '#2563eb', label: 'Publicaste un registro' },
}
const TABLA_LABELS: Record<string, string> = {
  registros_datos: 'Registro de dato',
  perfiles: 'Perfil',
  empresas: 'Empresa',
  sedes: 'Sede',
  evidencias: 'Evidencia',
  codigos_invitacion: 'Código de invitación',
}
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const PAGE_SIZE_ACTIVIDAD = 10

function humanizar(texto: string): string {
  const limpio = texto.replace(/_/g, ' ')
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}
function infoAccion(accion: string): { color: string; label: string } {
  return ACCION_INFO[accion] ?? { color: '#64748b', label: humanizar(accion) }
}
function tablaAmigable(tabla: string | null): string {
  if (!tabla) return 'Registro'
  return TABLA_LABELS[tabla] ?? humanizar(tabla)
}
function nombreMes(mes: number | null): string {
  if (!mes || mes < 1 || mes > 12) return ''
  return MESES[mes - 1]
}
function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const minutos = Math.floor(diff / 60000)
  const horas = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  if (minutos < 60) return `hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`
  if (horas < 24) return `hace ${horas} hora${horas !== 1 ? 's' : ''}`
  if (dias < 7) return `hace ${dias} día${dias !== 1 ? 's' : ''}`
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function IconoAccion({ accion, color, size = 16 }: { accion: string; color: string; size?: number }) {
  switch (accion) {
    case 'creado':      return <PencilIcon size={size} color={color} />
    case 'en_revision': return <SendIcon size={size} color={color} />
    case 'aprobado':    return <CheckCircleIcon size={size} color={color} />
    case 'rechazado':   return <XCircleIcon size={size} color={color} />
    case 'publicado':   return <LockIcon size={size} color={color} />
    default:            return <ClipboardIcon size={size} color={color} />
  }
}

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser]       = useState<{ id: string; email?: string } | null>(null)
  const [perfil, setPerfil]   = useState<Perfil | null>(null)
  const [empresa, setEmpresa] = useState<EmpresaBasica | null>(null)
  const [logs, setLogs]       = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [nombre, setNombre]   = useState('')
  const [pwdActual, setPwdActual]     = useState('')
  const [pwdNueva, setPwdNueva]       = useState('')
  const [pwdConfirm, setPwdConfirm]   = useState('')

  const [registrosMap, setRegistrosMap]   = useState<Record<string, RegistroDatoActividad>>({})
  const [actividadOffset, setActividadOffset]     = useState(0)
  const [actividadHasMore, setActividadHasMore]   = useState(false)
  const [cargandoMasActividad, setCargandoMasActividad] = useState(false)

  async function cargarActividad(uid: string, offset: number, append: boolean) {
    if (append) setCargandoMasActividad(true)

    const { data: logsData } = await supabase
      .from('audit_logs')
      .select('id, accion, tabla, registro_id, created_at')
      .eq('usuario_id', uid)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE_ACTIVIDAD - 1)

    const nuevos = (logsData ?? []) as AuditLog[]

    // Los ítems que referencian un registro de dato se completan con una
    // segunda consulta en lote (audit_logs.registro_id no tiene FK declarada,
    // así que no se puede embeber con .select() anidado).
    const idsRegistros = Array.from(new Set(
      nuevos
        .filter(l => l.tabla === 'registros_datos' && l.registro_id)
        .map(l => l.registro_id as string)
    ))

    if (idsRegistros.length > 0) {
      const { data: registrosData } = await supabase
        .from('registros_datos')
        .select('id, valor, mes, anio, indicadores(codigo, nombre, unidad, categoria)')
        .in('id', idsRegistros)

      if (registrosData) {
        setRegistrosMap(prev => {
          const next = { ...prev }
          for (const r of registrosData as unknown as RegistroDatoActividad[]) next[r.id] = r
          return next
        })
      }
    }

    setLogs(prev => append ? [...prev, ...nuevos] : nuevos)
    setActividadOffset(offset + nuevos.length)
    setActividadHasMore(nuevos.length === PAGE_SIZE_ACTIVIDAD)
    setCargandoMasActividad(false)
  }

  function verMasActividad() {
    if (!user) return
    cargarActividad(user.id, actividadOffset, true)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data: p } = await supabase
        .from('perfiles')
        .select('id, user_id, empresa_id, nombre, email, rol, activo, created_at')
        .eq('user_id', user.id)
        .single()

      if (p) {
        setPerfil(p)
        setNombre(p.nombre ?? '')

        if (p.empresa_id) {
          const { data: emp } = await supabase
            .from('empresas')
            .select('id, nombre')
            .eq('id', p.empresa_id)
            .single()
          if (emp) setEmpresa(emp)
        }
      }

      await cargarActividad(user.id, 0, false)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault()
    if (!perfil) return
    setSaving(true); setError(null); setSuccess(null)

    const { error } = await supabase
      .from('perfiles')
      .update({ nombre } as never)
      .eq('id', perfil.id)

    if (error) setError(error.message)
    else {
      setPerfil(p => p ? { ...p, nombre } : p)
      setSuccess('Nombre actualizado correctamente.')
    }
    setSaving(false)
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwdNueva !== pwdConfirm) { setError('Las contraseñas nuevas no coinciden.'); return }
    if (pwdNueva.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setSavingPwd(true); setError(null); setSuccess(null)

    const { error } = await supabase.auth.updateUser({ password: pwdNueva })
    if (error) setError('Error al cambiar contraseña: ' + error.message)
    else {
      setSuccess('Contraseña actualizada.')
      setPwdActual(''); setPwdNueva(''); setPwdConfirm('')
    }
    setSavingPwd(false)
  }

  const inicial = (perfil?.nombre ?? perfil?.email ?? '?')[0].toUpperCase()

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <Sidebar userEmail={user?.email} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Cargando perfil…</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} userName={perfil?.nombre ?? undefined} empresa={empresa?.nombre} rol={perfil?.rol ?? 'viewer'} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Mi Perfil" email={user?.email} empresa={empresa?.nombre}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Mi perfil' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 720 }}>

            {error && <div style={errBox}>{error}</div>}
            {success && <div style={sucBox}>{success}</div>}

            {/* Avatar + info básica */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '28px', marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {inicial}
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                  {perfil?.nombre ?? '(Sin nombre)'}
                </h2>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>{user?.email}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {perfil?.rol && <RoleBadge rol={perfil.rol} />}
                  {empresa && (
                    <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '2px 10px', borderRadius: 999, border: '1px solid #e2e8f0' }}>
                      {empresa.nombre}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Editar nombre */}
            <Card titulo="Datos personales" icono={<UserIcon size={16} />}>
              <form onSubmit={guardarNombre}>
                <label style={lbl}>Nombre completo</label>
                <input
                  style={inp} value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                />
                <label style={{ ...lbl, marginTop: 14 }}>Email</label>
                <input style={{ ...inp, background: '#f1f5f9', color: '#94a3b8' }} value={user?.email ?? ''} disabled />
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Guardando…' : 'Guardar nombre'}
                  </button>
                </div>
              </form>
            </Card>

            {/* Cambiar contraseña */}
            <Card titulo="Cambiar contraseña" icono={<LockIcon size={16} />}>
              <form onSubmit={cambiarPassword}>
                <label style={lbl}>Nueva contraseña</label>
                <input
                  type="password" style={inp} value={pwdNueva}
                  onChange={e => setPwdNueva(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
                <label style={{ ...lbl, marginTop: 14 }}>Confirmar contraseña</label>
                <input
                  type="password" style={inp} value={pwdConfirm}
                  onChange={e => setPwdConfirm(e.target.value)}
                  placeholder="Repetir contraseña"
                />
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={savingPwd || !pwdNueva || !pwdConfirm} style={{ ...btnPrimary, opacity: savingPwd ? 0.7 : 1 }}>
                    {savingPwd ? 'Actualizando…' : 'Cambiar contraseña'}
                  </button>
                </div>
              </form>
            </Card>

            {/* Actividad reciente */}
            <Card titulo="Actividad reciente" icono={<ClipboardIcon size={16} />}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: '#cbd5e1' }}>
                    <ClipboardIcon size={40} sw={1.4} />
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                    Aún no hay actividad registrada
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                    Aquí aparecerán tus acciones cuando empieces a usar el sistema
                  </p>
                </div>
              ) : (
                <>
                  <style>{`.eco-activity-row:hover{background:#f8fafc}`}</style>
                  <div>
                    {logs.map((log, i) => {
                      const { color, label } = infoAccion(log.accion)
                      const esRegistro = log.tabla === 'registros_datos'
                      const registro = esRegistro && log.registro_id ? registrosMap[log.registro_id] : undefined
                      const esUltimo = i === logs.length - 1

                      return (
                        <div key={log.id} className="eco-activity-row" style={{ display: 'flex', gap: 12, padding: '4px 10px', borderRadius: 10 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: `${color}1A`, border: `1px solid ${color}33`,
                            }}>
                              <IconoAccion accion={log.accion} color={color} size={15} />
                            </div>
                            {!esUltimo && <div style={{ width: 2, flex: 1, minHeight: 20, background: '#e2e8f0', margin: '4px 0' }} />}
                          </div>

                          <div style={{ flex: 1, paddingTop: 4, paddingBottom: esUltimo ? 6 : 16, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{label}</p>
                              <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {tiempoRelativo(log.created_at)}
                              </span>
                            </div>

                            {esRegistro ? (
                              registro ? (
                                <>
                                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
                                    {registro.indicadores
                                      ? <>GRI {registro.indicadores.codigo} — {registro.indicadores.nombre}</>
                                      : 'Indicador no disponible'}
                                  </p>
                                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                                    {registro.valor.toLocaleString('es-CO')} {registro.indicadores?.unidad ?? ''} · {nombreMes(registro.mes)} {registro.anio}
                                  </p>
                                </>
                              ) : (
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                                  Registro eliminado
                                </p>
                              )
                            ) : (
                              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                                {tablaAmigable(log.tabla)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {actividadHasMore && (
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <button
                        onClick={verMasActividad}
                        disabled={cargandoMasActividad}
                        style={{ ...btnSecondaryFull, opacity: cargandoMasActividad ? 0.7 : 1 }}
                      >
                        {cargandoMasActividad ? 'Cargando…' : 'Ver más actividad'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

function Card({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#64748b', display: 'flex' }}>{icono}</span>{titulo}
      </h3>
      {children}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
const btnPrimary: React.CSSProperties = { padding: '10px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSecondaryFull: React.CSSProperties = { padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const errBox: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 20 }
const sucBox: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, marginBottom: 20 }
