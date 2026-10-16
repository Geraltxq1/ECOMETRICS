/**
 * lib/fileValidation.ts
 * [16] Restringir tipos de archivos permitidos en Supabase Storage
 */

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'text/csv', 'text/plain',
])

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.csv', '.txt',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/jpeg',      bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',       bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',       bytes: [0x47, 0x49, 0x46] },
]

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export async function validateFile(file: File): Promise<FileValidationResult> {
  if (file.size > MAX_FILE_SIZE_BYTES)
    return { valid: false, error: `Archivo demasiado grande. Máximo ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` }
  if (file.size === 0)
    return { valid: false, error: 'El archivo está vacío.' }
  if (!ALLOWED_MIME_TYPES.has(file.type))
    return { valid: false, error: `Tipo de archivo no permitido: ${file.type}.` }

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext))
    return { valid: false, error: `Extensión no permitida: ${ext}` }

  const safeName = sanitizeFileName(file.name)
  if (!safeName)
    return { valid: false, error: 'Nombre de archivo inválido.' }

  // Verificar magic bytes para PDF e imágenes
  try {
    const header = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(header)
    const isImageOrPdf = file.type.startsWith('image/') || file.type === 'application/pdf'
    if (isImageOrPdf && file.type !== 'image/webp') {
      const matchesMagic = MAGIC_BYTES.some(({ mime, bytes: magic }) =>
        mime === file.type && magic.every((b, i) => bytes[i] === b)
      )
      if (!matchesMagic)
        return { valid: false, error: 'El contenido del archivo no coincide con el tipo declarado.' }
    }
  } catch { /* continuar si no se puede leer */ }

  return { valid: true }
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.\-_\s]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[./]+/, '')
    .trim()
    .slice(0, 200)
}

export function generateStoragePath(userId: string, originalName: string, folder = 'evidencias'): string {
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '')
  return `${folder}/${safeUserId}/${timestamp}-${random}.${ext}`
}
