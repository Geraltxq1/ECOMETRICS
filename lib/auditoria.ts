import { createClient } from './supabaseClient'

export async function registrarAuditoria(params: {
  empresaId: string | null
  usuarioId: string | null
  accion: string
  tabla: string
  registroId: string
  detalle?: Record<string, unknown>
}) {
  const supabase = createClient()
  const { error } = await supabase.from('audit_logs').insert({
    empresa_id:  params.empresaId,
    usuario_id:  params.usuarioId,
    accion:      params.accion,
    tabla:       params.tabla,
    registro_id: params.registroId,
    detalle:     params.detalle ?? null,
  } as never)
  if (error) console.error('Error registrando auditoría:', error.message)
}

export async function registrarComentarioRevision(params: {
  registroId: string
  usuarioId: string | null
  comentario: string
  accion: 'aprobado' | 'rechazado'
}) {
  const supabase = createClient()
  const { error } = await supabase.from('comentarios_revision').insert({
    registro_id: params.registroId,
    usuario_id:  params.usuarioId,
    comentario:  params.comentario,
    accion:      params.accion,
  } as never)
  if (error) console.error('Error registrando comentario:', error.message)
}
