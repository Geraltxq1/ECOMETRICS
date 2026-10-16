export interface Empresa {
  id: string; nombre: string; industria?: string
  ciudad?: string; pais?: string; user_id: string; created_at: string
}
export interface Perfil {
  id: string; user_id: string; empresa_id: string
  nombre?: string; email?: string
  rol: 'admin' | 'editor' | 'viewer' | 'auditor'
  activo: boolean; created_at: string
}
export interface Sede {
  id: string; empresa_id: string; nombre: string
  ciudad?: string; pais?: string; created_at: string
}
export interface Instalacion {
  id: string; sede_id: string; nombre: string; tipo?: string
}
export interface Indicador {
  id: string; estandar_id?: string; codigo: string; nombre: string
  unidad: string; factor_emision?: number | null
  alcance?: string; categoria?: string; descripcion?: string
  fuente_factor?: string; fase_recomendada?: string
}
export interface RegistroDato {
  id: string; empresa_id: string; sede_id?: string
  instalacion_id?: string; indicador_id: string; usuario_id: string
  valor: number; co2_calculado?: number | null
  anio: number; mes: number
  estado: 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'publicado'
  notas?: string; created_at: string
  revisado_por?: string; revisado_en?: string; publicado_en?: string
}
export interface Evidencia {
  id: string; registro_id: string; nombre_archivo?: string
  url_archivo?: string; tipo_archivo?: string; subido_por?: string; created_at: string
}
export interface CodigoInvitacion {
  id: string; empresa_id: string; codigo: string
  creado_por?: string; usado_por?: string
  rol_asignado: string; usado: boolean
  expira_en: string; created_at: string
}
export interface Notificacion {
  id: string; usuario_id: string; empresa_id?: string
  tipo: string; mensaje: string; leida: boolean
  registro_id?: string; created_at: string
}
