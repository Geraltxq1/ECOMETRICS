/**
 * lib/dataFilters.ts
 * [17] Devolver solo datos necesarios
 * [8]  Bloquear manipulación de campos protegidos
 */

const PROTECTED_FIELDS = new Set([
  'id', 'user_id', 'empresa_id', 'created_at',
  'rol', 'activo', 'usado', 'usado_por',
  'creado_por', 'service_role', 'email_confirm',
])

/** [8] Filtra campos protegidos del body del cliente */
export function stripProtectedFields<T extends Record<string, unknown>>(
  data: T,
  extraProtected: string[] = []
): Omit<T, string> {
  const allProtected = new Set([...PROTECTED_FIELDS, ...extraProtected])
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !allProtected.has(key))
  ) as Omit<T, string>
}

/** [17] Selectores mínimos para cada entidad (usar en .select() de Supabase) */
export const SELECT = {
  perfilPublico:    'id, nombre, rol, activo, created_at',
  perfilPropio:     'id, user_id, empresa_id, nombre, email, rol, activo, created_at',
  empresa:          'id, nombre, industria, ciudad, pais, sector, created_at',
  registro:         'id, empresa_id, sede_id, indicador_id, valor, unidad, periodo, notas, estado, created_at',
  indicador:        'id, codigo, nombre, descripcion, unidad_default, categoria',
  sede:             'id, empresa_id, nombre, ciudad, pais, created_at',
  codigoInvitacion: 'id, empresa_id, rol_asignado, usado, expira_en, created_at',
  notificacion:     'id, user_id, tipo, mensaje, leida, created_at',
} as const

/** [17] Elimina campos sensibles antes de enviar la respuesta */
export function sanitizeResponse<T extends Record<string, unknown>>(
  data: T,
  fieldsToRemove: string[] = []
): Partial<T> {
  const alwaysRemove = ['service_role_key', 'supabase_key', 'password_hash', 'password']
  const toRemove = new Set([...alwaysRemove, ...fieldsToRemove])
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !toRemove.has(key))
  ) as Partial<T>
}

export function sanitizeResponseArray<T extends Record<string, unknown>>(
  data: T[],
  fieldsToRemove: string[] = []
): Partial<T>[] {
  return data.map((item) => sanitizeResponse(item, fieldsToRemove))
}
