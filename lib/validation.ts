/**
 * lib/validation.ts
 * [13] Queries parametrizadas (Supabase SDK ya las parametriza)
 * [14] Validación de inputs
 * [15] Sanitización de contenido
 */

const emailSchema = {
  validate: (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('Email debe ser texto')
    const trimmed = v.trim().toLowerCase()
    if (!trimmed) throw new Error('Email es requerido')
    if (trimmed.length > 254) throw new Error('Email demasiado largo')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new Error('Formato de email inválido')
    return trimmed
  },
}

const passwordSchema = {
  validate: (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('Contraseña debe ser texto')
    if (v.length < 8) throw new Error('Contraseña debe tener al menos 8 caracteres')
    if (v.length > 128) throw new Error('Contraseña demasiado larga')
    if (!/[A-Z]/.test(v)) throw new Error('Contraseña debe tener al menos una mayúscula')
    if (!/[0-9]/.test(v)) throw new Error('Contraseña debe tener al menos un número')
    return v
  },
}

const uuidSchema = {
  validate: (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('ID inválido')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
      throw new Error('ID con formato inválido')
    return v
  },
}

const codigoInvitacionSchema = {
  validate: (v: unknown): string => {
    if (typeof v !== 'string') throw new Error('Código inválido')
    const cleaned = v.trim().toUpperCase()
    if (!/^ECO-\d{4}-[A-Z0-9]{4}$/.test(cleaned)) throw new Error('Formato de código inválido')
    return cleaned
  },
}

const rolSchema = {
  validate: (v: unknown): string => {
    const ROLES_VALIDOS = ['admin', 'editor', 'viewer', 'auditor']
    if (typeof v !== 'string') throw new Error('Rol inválido')
    if (!ROLES_VALIDOS.includes(v)) throw new Error('Rol no permitido')
    return v
  },
}

// [15] Sanitización
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

export function sanitizeName(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.trim().slice(0, 100).replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-_.,']/g, '')
}

export interface ValidationResult<T> {
  data?: T
  error?: string
}

export function validateAdminRegister(body: unknown): ValidationResult<{ email: string; password: string; code: string }> {
  try {
    if (!body || typeof body !== 'object') throw new Error('Body inválido')
    const b = body as Record<string, unknown>
    return {
      data: {
        email:    emailSchema.validate(b.email),
        password: passwordSchema.validate(b.password),
        code:     typeof b.code === 'string' ? b.code.trim() : (() => { throw new Error('Código requerido') })(),
      },
    }
  } catch (e) { return { error: (e as Error).message } }
}

export function validateUsarCodigo(body: unknown): ValidationResult<{ userId: string; codigo: string; nombre: string; email: string }> {
  try {
    if (!body || typeof body !== 'object') throw new Error('Body inválido')
    const b = body as Record<string, unknown>
    return {
      data: {
        userId: uuidSchema.validate(b.userId),
        codigo: codigoInvitacionSchema.validate(b.codigo),
        nombre: sanitizeName(b.nombre),
        email:  emailSchema.validate(b.email),
      },
    }
  } catch (e) { return { error: (e as Error).message } }
}

export function validateGenerarCodigo(body: unknown): ValidationResult<{ rolInv: string }> {
  try {
    if (!body || typeof body !== 'object') throw new Error('Body inválido')
    const b = body as Record<string, unknown>
    return { data: { rolInv: b.rolInv !== undefined ? rolSchema.validate(b.rolInv) : 'editor' } }
  } catch (e) { return { error: (e as Error).message } }
}

export function validateInvitar(body: unknown): ValidationResult<{ email: string; empresa_id: string }> {
  try {
    if (!body || typeof body !== 'object') throw new Error('Body inválido')
    const b = body as Record<string, unknown>
    return { data: { email: emailSchema.validate(b.email), empresa_id: uuidSchema.validate(b.empresa_id) } }
  } catch (e) { return { error: (e as Error).message } }
}

export function validateRouteId(id: unknown): ValidationResult<string> {
  try { return { data: uuidSchema.validate(id) } }
  catch (e) { return { error: (e as Error).message } }
}
