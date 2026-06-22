interface CalculoTransparenteProps {
  valor: number
  unidad: string
  factorEmision: number | null
  fuenteFactor: string | null
  co2Calculado: number | null
  nombreIndicador: string
}

export default function CalculoTransparente({
  valor, unidad, factorEmision, fuenteFactor, co2Calculado, nombreIndicador,
}: CalculoTransparenteProps) {
  return (
    <div style={{
      background: '#f8fafc',
      borderLeft: '3px solid #16a34a',
      borderRadius: '0 10px 10px 0',
      padding: '18px 22px',
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
        Transparencia del cálculo
      </h3>

      {factorEmision == null ? (
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          Este indicador no genera cálculo de CO₂.
        </p>
      ) : (
        <>
          <div style={{
            fontFamily: "'Consolas', 'Courier New', monospace",
            fontSize: 14,
            color: '#0f172a',
            lineHeight: 1.7,
          }}>
            {valor.toLocaleString('es-CO')} {unidad} × {factorEmision} (factor de {nombreIndicador})
            <br />
            = <strong style={{ color: '#dc2626' }}>{co2Calculado != null ? co2Calculado.toFixed(4) : '—'} tCO₂e</strong>
          </div>

          <p style={{ margin: '14px 0 0', fontSize: 12, color: '#64748b' }}>
            Fuente del factor: {fuenteFactor ?? 'No especificada'}
          </p>
        </>
      )}
    </div>
  )
}
