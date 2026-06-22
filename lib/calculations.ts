export function calcularCO2(valor: number, factorEmision: number | null): number {
  if (!factorEmision) return 0
  return valor * factorEmision
}

export function formatearCO2(tco2e: number): string {
  if (tco2e === 0) return '0 tCO₂e'
  if (tco2e < 0.001) return `${(tco2e * 1000).toFixed(4)} kgCO₂e`
  if (tco2e >= 1000) return `${(tco2e / 1000).toFixed(2)} ktCO₂e`
  return `${tco2e.toFixed(4)} tCO₂e`
}

export function getCategoriaColor(categoria: string | null): string {
  switch (categoria) {
    case 'energia':   return '#b45309'
    case 'agua':      return '#1d4ed8'
    case 'residuos':  return '#7e22ce'
    case 'emisiones': return '#dc2626'
    default:          return '#64748b'
  }
}

export function getCategoriaLabel(categoria: string | null): string {
  switch (categoria) {
    case 'energia':   return 'Energía'
    case 'agua':      return 'Agua'
    case 'residuos':  return 'Residuos'
    case 'emisiones': return 'Emisiones'
    default:          return categoria ?? '—'
  }
}

export function formatearValor(valor: number, unidad: string): string {
  return `${valor.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${unidad}`
}

export function getCategoriaIcon(categoria: string | null): string {
  switch (categoria) {
    case 'energia':   return '⚡'
    case 'agua':      return '💧'
    case 'residuos':  return '♻️'
    case 'emisiones': return '💨'
    default:          return '📊'
  }
}

export function getAlcanceLabel(alcance: string | null): string {
  switch (alcance) {
    case 'alcance_1': return 'Alcance 1'
    case 'alcance_2': return 'Alcance 2'
    case 'alcance_3': return 'Alcance 3'
    default:          return alcance ?? '—'
  }
}

export function getEstadoColor(estado: string): string {
  switch (estado) {
    case 'borrador':     return '#64748b'
    case 'en_revision':  return '#d97706'
    case 'aprobado':     return '#16a34a'
    case 'rechazado':    return '#dc2626'
    case 'publicado':    return '#0284c7'
    default:             return '#94a3b8'
  }
}

export function getEstadoLabel(estado: string): string {
  switch (estado) {
    case 'borrador':     return 'Borrador'
    case 'en_revision':  return 'En revisión'
    case 'aprobado':     return 'Aprobado'
    case 'rechazado':    return 'Rechazado'
    case 'publicado':    return 'Publicado'
    default:             return estado
  }
}
