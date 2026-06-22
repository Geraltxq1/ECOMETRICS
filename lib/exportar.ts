export interface RegistroExport {
  created_at: string
  sede_nombre: string
  indicador_codigo: string
  indicador_nombre: string
  categoria: string
  valor: number
  unidad: string
  co2_calculado: number | null
  estado: string
  usuario_email: string
}

export function exportarRegistrosCSV(registros: RegistroExport[], nombreEmpresa: string) {
  const headers = ['Fecha', 'Sede', 'Código GRI', 'Indicador', 'Categoría', 'Valor', 'Unidad', 'CO2 (tCO2e)', 'Estado', 'Usuario']

  const filas = registros.map(r => [
    new Date(r.created_at).toLocaleDateString('es-CO'),
    r.sede_nombre,
    r.indicador_codigo,
    r.indicador_nombre,
    r.categoria,
    r.valor,
    r.unidad,
    r.co2_calculado ?? 'N/A',
    r.estado,
    r.usuario_email,
  ].map(v => `"${v}"`).join(','))

  const csv = [headers.join(','), ...filas].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ecometrics_${nombreEmpresa.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
