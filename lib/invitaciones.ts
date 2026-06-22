const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generarCodigo(anio: number): string {
  const rand = Array.from(
    { length: 4 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
  return `ECO-${anio}-${rand}`
}

export function validarCodigo(codigo: string): boolean {
  return /^ECO-\d{4}-[A-Z0-9]{4}$/.test(codigo)
}

export function formatearExpiracion(fecha: string): string {
  const d = new Date(fecha)
  const ahora = new Date()
  if (d < ahora) return 'Expirado'
  const diffMs = d.getTime() - ahora.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDias === 1) return 'Expira mañana'
  if (diffDias <= 7) return `Expira en ${diffDias} días`
  return `Expira ${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
