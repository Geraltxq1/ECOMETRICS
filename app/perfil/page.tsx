'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import RoleBadge from '@/components/RoleBadge'
import type { Perfil, AuditLog } from '@/lib/types'
import { UserIcon, LockIcon, ClipboardIcon, PlusIcon, TrashIcon, PencilIcon, PinIcon } from '@/components/Icons'

interface EmpresaBasica { id: string; nombre: string }

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

      // Últimos 10 audit_logs del usuario
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('id, accion, tabla, registro_id, created_at, detalle')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setLogs((logsData ?? []) as AuditLog[])
      setLoading(false)
    }
    load()
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
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin actividad registrada.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {logs.map(log => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ flexShrink: 0, marginTop: 2, color: '#94a3b8', display: 'flex' }}>
                        {log.accion?.includes('crear') ? <PlusIcon size={15} /> : log.accion?.includes('eliminar') ? <TrashIcon size={15} /> : log.accion?.includes('actualizar') ? <PencilIcon size={15} /> : <PinIcon size={15} />}
                      </span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                          {log.accion}
                        </p>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {new Date(log.created_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {log.tabla && <> · {log.tabla}</>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
const errBox: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 20 }
const sucBox: React.CSSProperties = { padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, marginBottom: 20 }
