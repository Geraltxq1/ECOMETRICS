// Tipos centralizados del proyecto ECOMETRICS

export interface Empresa {
  id: string
  user_id: string
  nombre: string
  industria: string | null
  ciudad: string | null
  pais: string | null
  notificar_revision: boolean | null
  notificar_rechazo: boolean | null
  created_at: string
}

export interface Perfil {
  id: string
  user_id: string
  empresa_id: string | null
  nombre: string | null
  email: string | null
  rol: string
  activo: boolean
  created_at?: string
}

export interface Sede {
  id: string
  empresa_id: string
  nombre: string
  ciudad: string | null
  pais: string | null
  created_at?: string
}

export interface Instalacion {
  id: string
  sede_id: string
  nombre: string
  tipo: string | null
  created_at?: string
}

export interface Indicador {
  id: string
  codigo: string
  nombre: string
  unidad: string
  factor_emision: number | null
  categoria: string | null
  alcance: string | null
  descripcion: string | null
}

export interface RegistroDato {
  id: string
  empresa_id: string
  sede_id: string | null
  instalacion_id: string | null
  indicador_id: string
  usuario_id: string | null
  valor: number
  co2_calculado: number | null
  mes: number | null
  anio: number
  estado: 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'publicado'
  notas: string | null
  revisado_por: string | null
  revisado_en: string | null
  publicado_en: string | null
  created_at: string
  updated_at?: string
  // Relaciones opcionales (joins)
  empresas?: { nombre: string }
  sedes?: { nombre: string }
  instalaciones?: { nombre: string }
  indicadores?: { codigo: string; nombre: string; unidad: string; factor_emision: number | null; alcance: string | null }
  evidencias?: Evidencia[]
}

export interface Evidencia {
  id: string
  registro_id: string
  nombre_archivo: string
  url_archivo: string
  tipo_archivo: string | null
  created_at?: string
}

export interface CodigoInvitacion {
  id: string
  empresa_id: string
  codigo: string
  rol_asignado: string
  creado_por: string | null
  usado: boolean
  usado_por: string | null
  expira_en: string
  created_at: string
}

export interface Notificacion {
  id: string
  usuario_id: string
  empresa_id: string | null
  tipo: 'registro_enviado' | 'registro_aprobado' | 'registro_rechazado' | 'miembro_unido' | string
  mensaje: string
  registro_id: string | null
  leida: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  empresa_id: string | null
  usuario_id: string | null
  accion: string
  tabla: string | null
  registro_id: string | null
  detalle: Record<string, unknown> | null
  created_at: string
}

export interface ComentarioRevision {
  id: string
  registro_id: string
  usuario_id: string | null
  comentario: string
  accion: string
  created_at: string
}

// Tipos de utilidad para formularios
export type EstadoRegistro = 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'publicado'
export type RolUsuario = 'admin' | 'editor' | 'viewer' | 'auditor'
export type CategoriaIndicador = 'energia' | 'agua' | 'residuos' | 'emisiones'
export type AlcanceGEI = 'alcance_1' | 'alcance_2' | 'alcance_3'
