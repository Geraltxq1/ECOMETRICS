'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabaseClient'
import EstadoBadge from '@/components/EstadoBadge'
import { canAudit } from '@/lib/permissions'
import { SearchIcon } from '@/components/Icons'
import { registrarAuditoria, registrarComentarioRevision } from '@/lib/auditoria'
import ModalRevision from '@/components/ModalRevision'

interface RevisionRegistro {
  id: string
  valor: number
  co2_calculado: number | null
  mes: number | null
  anio: number
  estado: string
  created_at: string
  usuario_id: string | null
  empresa_id: string | null
  empresas?: { nombre: string }
  sedes?: { nombre: string }
  indicadores?: { codigo: string; nombre: string; unidad: string }
  usuario_email?: string
}


const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function RevisionPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [rol, setRol] = useState<string>('viewer')
  const [registros, setRegistros] = useState<RevisionRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [modalAccion, setModalAccion] = useState<{ id: string; accion: 'aprobado' | 'rechazado' } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('user_id', user.id)
        .maybeSingle()

      const rolActual = perfil?.rol ?? 'viewer'
      setRol(rolActual)
      if (!canAudit(rolActual)) { window.location.href = '/dashboard'; return }

      const { data: registrosData } = await supabase
        .from('registros_datos')
        .select('id, valor, co2_calculado, mes, anio, estado, created_at, usuario_id, empresa_id, empresas(nombre), sedes(nombre), indicadores(codigo, nombre, unidad)')
        .eq('estado', 'en_revision')
        .order('created_at', { ascending: false })
        .limit(100)

      if (registrosData) {
        // Obtener emails de usuarios únicos
        const userIds = [...new Set(registrosData.map(r => r.usuario_id).filter(Boolean))]
        const { data: usersData } = await supabase
          .from('perfiles')
          .select('user_id, email')
          .in('user_id', userIds)

        const userEmailMap = new Map(usersData?.map(u => [u.user_id, u.email]) ?? [])

        const registrosConEmail = registrosData.map(reg => ({
          ...reg,
          usuario_email: reg.usuario_id ? userEmailMap.get(reg.usuario_id) ?? '—' : '—'
        }))

        setRegistros(registrosConEmail as unknown as RevisionRegistro[])
      } else {
        setRegistros([])
      }

      setLoading(false)
    }
    load()
  }, [supabase])

  const actualizarRegistro = async (id: string, estado: string, comentario?: string) => {
    setActionLoading(id)

    try {
      const registro = registros.find(r => r.id === id)
      const userId = (user as { id?: string } | null)?.id

      const updatePayload: Record<string, unknown> = {
        estado,
        revisado_por: userId,
        revisado_en: new Date().toISOString(),
      }

      const { error: updateError } = await supabase.from('registros_datos').update(updatePayload as never).eq('id', id)

      if (updateError) {
        console.error('Error updating registro:', updateError.message)
        alert('Error al actualizar el registro. Intenta de nuevo.')
        return
      }

      await registrarAuditoria({
        empresaId: registro?.empresa_id ?? null, usuarioId: userId ?? null, accion: estado,
        tabla: 'registros_datos', registroId: id,
      })

      if (estado === 'aprobado' || estado === 'rechazado') {
        await registrarComentarioRevision({
          registroId: id, usuarioId: userId ?? null,
          comentario: comentario || 'Aprobado sin comentarios adicionales.',
          accion: estado,
        })
      }

      // Notificar al creador del registro
      if (registro?.usuario_id && registro.usuario_id !== userId) {
        const mensajes: Record<string, string> = {
          aprobado:  'Tu registro fue aprobado.',
          rechazado: comentario ? `Tu registro fue rechazado: ${comentario}` : 'Tu registro fue rechazado.',
        }
        if (mensajes[estado]) {
          await supabase.from('notificaciones').insert({
            usuario_id:  registro.usuario_id,
            tipo:        estado,
            mensaje:     mensajes[estado],
            registro_id: id,
          } as never)
        }
      }

      setRegistros(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Error inesperado. Intenta de nuevo.')
    } finally {
      setActionLoading(null)
      setModalAccion(null)
    }
  }


  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {modalAccion && (
        <ModalRevision
          accion={modalAccion.accion}
          onConfirmar={comentario => actualizarRegistro(modalAccion.id, modalAccion.accion, comentario)}
          onCancelar={() => setModalAccion(null)}
          cargando={actionLoading === modalAccion.id}
        />
      )}
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Revisión" email={user?.email}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Revisión' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando registros en revisión…</div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Registros para revisión</h2>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>{registros.length} registro{registros.length !== 1 ? 's' : ''} pendientes</p>
                </div>
                <Link href="/registros" style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Ver todos</Link>
              </div>

              {registros.length === 0 ? (
                <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ marginBottom: 12 }}><SearchIcon size={44} color="#cbd5e1" /></div>
                  <p style={{ margin: 0, fontSize: 14 }}>No hay registros pendientes de revisión.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Empresa', 'Sede', 'Indicador', 'Valor', 'Fecha', 'Enviado por', 'Estado', 'Acciones'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {registros.map(reg => {
                        const ind = reg.indicadores
                        return (
                          <tr key={reg.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={td}>{reg.empresas?.nombre ?? '—'}</td>
                            <td style={td}>{reg.sedes?.nombre ?? '—'}</td>
                            <td style={td}><strong>{ind?.codigo}</strong><div style={{ fontSize: 12, color: '#64748b' }}>{ind?.nombre}</div></td>
                            <td style={td}>{reg.valor.toLocaleString('es-CO')} <span style={{ color: '#94a3b8', fontSize: 11 }}>{ind?.unidad}</span></td>
                            <td style={td}>{reg.mes ? `${MESES[reg.mes]} ${reg.anio}` : reg.anio}</td>
                            <td style={td}>{reg.usuario_email ?? '—'}</td>
                            <td style={td}><EstadoBadge estado={reg.estado} /></td>
                            <td style={{ ...td, minWidth: 220 }}>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Link href={`/registros/${reg.id}`} style={actionLink}>Ver detalle</Link>
                                <button type="button" onClick={() => setModalAccion({ id: reg.id, accion: 'aprobado' })} disabled={actionLoading === reg.id} style={btnSuccess}>
                                  Aprobar
                                </button>
                                <button type="button" onClick={() => setModalAccion({ id: reg.id, accion: 'rechazado' })} disabled={actionLoading === reg.id} style={btnWarning}>
                                  Rechazar
                                </button>
                              </div>
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

const th: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }
const td: React.CSSProperties = { padding: '14px 16px', fontSize: 13, color: '#374151', verticalAlign: 'top' }
const actionLink: React.CSSProperties = { fontSize: 12, color: '#16a34a', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '7px 10px', textDecoration: 'none', fontWeight: 700 }
const btnSuccess: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#fff', background: '#16a34a', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }
const btnWarning: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }
