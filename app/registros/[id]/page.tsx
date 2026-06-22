'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import EstadoBadge from '@/components/EstadoBadge'
import { createClient } from '@/lib/supabaseClient'
import { canAudit, canPublish as canPublishRole } from '@/lib/permissions'
import { FileIcon } from '@/components/Icons'
import { registrarAuditoria, registrarComentarioRevision } from '@/lib/auditoria'
import CalculoTransparente from '@/components/CalculoTransparente'
import LineaTiempo, { type EventoTimeline } from '@/components/LineaTiempo'
import ModalRevision from '@/components/ModalRevision'

interface RegistroDetalle {
  id: string
  valor: number
  co2_calculado: number | null
  mes: number | null
  anio: number
  estado: string
  notas: string | null
  publicado_en: string | null
  revisado_por: string | null
  revisado_en: string | null
  created_at: string
  empresa_id?: string
  sede_id?: string
  indicador_id?: string
  usuario_id?: string
  empresas?: { nombre: string }
  sedes?: { nombre: string }
  indicadores?: { codigo: string; nombre: string; unidad: string; factor_emision: number | null; alcance: string | null; fuente_factor: string | null }
  evidencias?: { nombre_archivo: string; url_archivo: string; tipo_archivo: string | null }[]
}

interface LogAuditoria { id: string; accion: string; usuario_id: string | null; created_at: string }
interface ComentarioRev { id: string; usuario_id: string | null; comentario: string; accion: string; created_at: string }

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function RegistroDetallePage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [registro, setRegistro] = useState<RegistroDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [modalAccion, setModalAccion] = useState<'aprobado' | 'rechazado' | null>(null)
  const [rol, setRol] = useState<string>('viewer')
  const [eventos, setEventos] = useState<EventoTimeline[]>([])

  async function cargarTimeline(registroData: RegistroDetalle, logs: LogAuditoria[], comentarios: ComentarioRev[]) {
    const tieneCreado = logs.some(l => l.accion === 'creado')
    const logsCompletos: LogAuditoria[] = tieneCreado ? logs : [
      { id: 'creado-fallback', accion: 'creado', usuario_id: registroData.usuario_id ?? null, created_at: registroData.created_at },
      ...logs,
    ]

    const userIds = [...new Set(logsCompletos.map(l => l.usuario_id).filter((id): id is string => !!id))]
    const nombreMap = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: perfilesData } = await supabase.from('perfiles').select('user_id, nombre, email').in('user_id', userIds)
      perfilesData?.forEach(p => nombreMap.set(p.user_id, p.nombre || p.email || 'Usuario'))
    }

    const usados = new Set<string>()
    const eventosTimeline: EventoTimeline[] = logsCompletos.map(l => {
      let comentarioTexto: string | null = null
      if (l.accion === 'aprobado' || l.accion === 'rechazado') {
        const candidatos = comentarios
          .filter(c => !usados.has(c.id) && c.accion === l.accion && c.usuario_id === l.usuario_id)
          .sort((a, b) => Math.abs(new Date(a.created_at).getTime() - new Date(l.created_at).getTime()) -
                          Math.abs(new Date(b.created_at).getTime() - new Date(l.created_at).getTime()))
        if (candidatos[0]) {
          comentarioTexto = candidatos[0].comentario
          usados.add(candidatos[0].id)
        }
      }
      return {
        id: l.id,
        accion: l.accion,
        usuario: l.usuario_id ? (nombreMap.get(l.usuario_id) ?? 'Usuario') : 'Sistema',
        fecha: l.created_at,
        comentario: comentarioTexto,
      }
    })

    setEventos(eventosTimeline.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()))
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUser(user)
        if (!params.id) { router.push('/registros'); return }

        const { data: perfil } = await supabase.from('perfiles').select('rol').eq('user_id', user.id).maybeSingle()
        setRol(perfil?.rol ?? 'viewer')

        const { data, error: fetchError } = await supabase
          .from('registros_datos')
          .select(`id, valor, co2_calculado, mes, anio, estado, notas, publicado_en, revisado_por, revisado_en, created_at, empresa_id, sede_id, indicador_id`)
          .eq('id', params.id)
          .maybeSingle()

        if (fetchError) {
          setError('No se pudo cargar el registro. Intenta recargar la página.')
          console.error('Fetch registro error:', fetchError.message ?? JSON.stringify(fetchError))
        } else if (!data) {
          setError('Registro no encontrado o no tienes acceso a él.')
        } else {
          const registroData = data as RegistroDetalle
          const [empresaRes, sedeRes, indicadorRes, evidenciasRes, logsRes, comentariosRes] = await Promise.all([
            supabase.from('empresas').select('nombre').eq('id', registroData.empresa_id).maybeSingle(),
            supabase.from('sedes').select('nombre').eq('id', registroData.sede_id).maybeSingle(),
            supabase.from('indicadores').select('codigo, nombre, unidad, factor_emision, alcance, fuente_factor').eq('id', registroData.indicador_id).maybeSingle(),
            supabase.from('evidencias').select('nombre_archivo, url_archivo, tipo_archivo').eq('registro_id', params.id),
            supabase.from('audit_logs').select('id, accion, usuario_id, created_at').eq('registro_id', params.id).order('created_at'),
            supabase.from('comentarios_revision').select('id, usuario_id, comentario, accion, created_at').eq('registro_id', params.id).order('created_at'),
          ])

          if (empresaRes.error) console.error('Fetch empresa error:', empresaRes.error.message ?? JSON.stringify(empresaRes.error))
          if (sedeRes.error) console.error('Fetch sede error:', sedeRes.error.message ?? JSON.stringify(sedeRes.error))
          if (indicadorRes.error) console.error('Fetch indicador error:', indicadorRes.error.message ?? JSON.stringify(indicadorRes.error))
          if (evidenciasRes.error) console.error('Fetch evidencias error:', evidenciasRes.error.message ?? JSON.stringify(evidenciasRes.error))

          setRegistro({
            ...registroData,
            empresas: empresaRes.data ? { nombre: empresaRes.data.nombre } : undefined,
            sedes: sedeRes.data ? { nombre: sedeRes.data.nombre } : undefined,
            indicadores: indicadorRes.data ? indicadorRes.data as RegistroDetalle['indicadores'] : undefined,
            evidencias: evidenciasRes.data ?? [],
          })

          await cargarTimeline(registroData, logsRes.data ?? [], comentariosRes.data ?? [])
        }
      } catch (caught) {
        setError('Ocurrió un error inesperado al cargar el registro.')
        console.error(caught)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router, supabase])

  const userId = (user as { id?: string })?.id

  const insertNotificacion = async (destinatarioId: string, tipo: string, mensaje: string) => {
    await supabase.from('notificaciones').insert({
      usuario_id:  destinatarioId,
      empresa_id:  registro?.empresa_id,
      tipo,
      mensaje,
      registro_id: registro?.id,
    } as never)
  }

  const actualizarEstado = async (nuevoEstado: string, comentarioAprobacion?: string) => {
    if (!registro) return
    setActionLoading(true)
    const { error } = await supabase.from('registros_datos').update({ estado: nuevoEstado, revisado_por: userId, revisado_en: new Date().toISOString(), publicado_en: nuevoEstado === 'publicado' ? new Date().toISOString() : registro.publicado_en } as never).eq('id', registro.id)
    if (!error) {
      setRegistro({ ...registro, estado: nuevoEstado, revisado_por: userId ?? null, revisado_en: new Date().toISOString(), publicado_en: nuevoEstado === 'publicado' ? new Date().toISOString() : registro.publicado_en })

      await registrarAuditoria({
        empresaId: registro.empresa_id ?? null, usuarioId: userId ?? null, accion: nuevoEstado,
        tabla: 'registros_datos', registroId: registro.id,
      })
      let comentarioGuardado: string | null = null
      if (nuevoEstado === 'aprobado') {
        comentarioGuardado = comentarioAprobacion?.trim() || 'Aprobado sin comentarios adicionales.'
        await registrarComentarioRevision({
          registroId: registro.id, usuarioId: userId ?? null,
          comentario: comentarioGuardado, accion: 'aprobado',
        })
      }
      setEventos(prev => [...prev, {
        id: `local-${Date.now()}`, accion: nuevoEstado, usuario: 'Tú', fecha: new Date().toISOString(),
        comentario: comentarioGuardado,
      }])

      if (registro.usuario_id && registro.usuario_id !== userId) {
        const mensajes: Record<string, string> = {
          aprobado:  'Tu registro fue aprobado.',
          publicado: 'Tu registro fue publicado.',
        }
        if (mensajes[nuevoEstado]) await insertNotificacion(registro.usuario_id, nuevoEstado, mensajes[nuevoEstado])
      }
    }
    setActionLoading(false)
    setModalAccion(null)
  }

  const handleReject = async (comentario: string) => {
    if (!registro || !comentario.trim()) return
    setActionLoading(true)
    const { error } = await supabase.from('registros_datos').update({ estado: 'rechazado', revisado_por: userId, revisado_en: new Date().toISOString() } as never).eq('id', registro.id)
    if (error) {
      setError('Error al rechazar el registro: ' + error.message)
    } else {
      await registrarAuditoria({
        empresaId: registro.empresa_id ?? null, usuarioId: userId ?? null, accion: 'rechazado',
        tabla: 'registros_datos', registroId: registro.id,
      })
      await registrarComentarioRevision({
        registroId: registro.id, usuarioId: userId ?? null, comentario, accion: 'rechazado',
      })
      setEventos(prev => [...prev, {
        id: `local-${Date.now()}`, accion: 'rechazado', usuario: 'Tú', fecha: new Date().toISOString(), comentario,
      }])

      if (registro.usuario_id && registro.usuario_id !== userId) {
        await insertNotificacion(registro.usuario_id, 'rechazado', `Tu registro fue rechazado: ${comentario}`)
      }
      setRegistro({ ...registro, estado: 'rechazado', revisado_por: userId ?? null, revisado_en: new Date().toISOString() })
      setModalAccion(null)
    }
    setActionLoading(false)
  }

  const canEdit = registro?.estado === 'borrador'
  const canReview = registro?.estado === 'en_revision' && canAudit(rol)
  const canPublish = registro?.estado === 'aprobado' && canPublishRole(rol)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {modalAccion && (
        <ModalRevision
          accion={modalAccion}
          onConfirmar={comentario => modalAccion === 'aprobado' ? actualizarEstado('aprobado', comentario) : handleReject(comentario)}
          onCancelar={() => setModalAccion(null)}
          cargando={actionLoading}
        />
      )}
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Detalle de registro" email={user?.email}
          breadcrumb={[{ label: 'Registros', href: '/registros' }, { label: 'Detalle' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando registro…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#b91c1c', fontSize: 14 }}>{error}</div>
          ) : !registro ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#64748b', fontSize: 14 }}>Registro no encontrado.</div>
          ) : (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{registro.indicadores?.codigo ?? 'Registro'}</h2>
                  <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13 }}>{registro.indicadores?.nombre}</p>
                </div>
                <EstadoBadge estado={registro.estado} />
              </div>

              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 2px 14px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>
                  <InfoBlock label="Empresa" value={registro.empresas?.nombre ?? '—'} />
                  <InfoBlock label="Sede" value={registro.sedes?.nombre ?? '—'} />
                  <InfoBlock label="Valor" value={`${registro.valor.toLocaleString('es-CO')} ${registro.indicadores?.unidad ?? ''}`} />
                  <InfoBlock label="CO₂ calculado" value={registro.co2_calculado != null ? `${registro.co2_calculado.toFixed(4)} tCO₂e` : '—'} />
                  <InfoBlock label="Período" value={registro.mes ? `${MESES[registro.mes]} ${registro.anio}` : String(registro.anio)} />
                  <InfoBlock label="Revisado por" value={registro.revisado_por ?? '—'} />
                  <InfoBlock label="Revisado en" value={registro.revisado_en ? new Date(registro.revisado_en).toLocaleString('es-CO') : '—'} />
                  <InfoBlock label="Publicado en" value={registro.publicado_en ? new Date(registro.publicado_en).toLocaleString('es-CO') : '—'} />
                </div>

                <div style={{ marginBottom: 22 }}>
                  <CalculoTransparente
                    valor={registro.valor}
                    unidad={registro.indicadores?.unidad ?? ''}
                    factorEmision={registro.indicadores?.factor_emision ?? null}
                    fuenteFactor={registro.indicadores?.fuente_factor ?? null}
                    co2Calculado={registro.co2_calculado}
                    nombreIndicador={registro.indicadores?.codigo ?? registro.indicadores?.nombre ?? 'este indicador'}
                  />
                </div>

                <div style={{ marginBottom: 22 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Notas del registro</h3>
                  <p style={{ margin: 0, color: '#475569', lineHeight: 1.8 }}>{registro.notas ?? 'Sin notas adicionales.'}</p>
                </div>
                <div style={{ marginBottom: 22 }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Evidencia adjunta</h3>
                  {registro.evidencias && registro.evidencias.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {registro.evidencias.map(e => {
                        const esImagen = e.tipo_archivo?.startsWith('image/')
                        return (
                          <div key={e.url_archivo}>
                            {esImagen ? (
                              <a href={e.url_archivo} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
                                <img
                                  src={e.url_archivo}
                                  alt={e.nombre_archivo}
                                  style={{ maxWidth: 340, maxHeight: 260, borderRadius: 10, border: '1.5px solid #e2e8f0', objectFit: 'cover', display: 'block', cursor: 'zoom-in', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                                />
                                <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#64748b' }}>{e.nombre_archivo} · click para abrir</span>
                              </a>
                            ) : (
                              <a href={e.url_archivo} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
                                <FileIcon size={20} color="#dc2626" />
                                <span>{e.nombre_archivo || 'Ver evidencia'}</span>
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No hay archivo adjunto.</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {canEdit && (
                    <Link href="/registros/nuevo" style={btnSecondary}>Editar</Link>
                  )}
                  {canEdit && (
                    <button type="button" onClick={() => actualizarEstado('en_revision')} disabled={actionLoading} style={btnPrimary}>Enviar a revisión</button>
                  )}
                  {canReview && (
                    <>
                      <button type="button" onClick={() => setModalAccion('aprobado')} disabled={actionLoading} style={btnSuccess}>Aprobar</button>
                      <button type="button" onClick={() => setModalAccion('rechazado')} disabled={actionLoading} style={btnWarning}>Rechazar</button>
                    </>
                  )}
                  {canPublish && (
                    <button type="button" onClick={() => actualizarEstado('publicado')} disabled={actionLoading} style={btnPublish}>Publicar</button>
                  )}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '28px', marginTop: 22, boxShadow: '0 2px 14px rgba(15,23,42,0.04)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Línea de tiempo</h3>
                <LineaTiempo eventos={eventos} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#fff', background: '#16a34a', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }
const btnSuccess: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#fff', background: '#15803d', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }
const btnWarning: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }
const btnPublish: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#fff', background: '#2563eb', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }
