-- Asegurar constraint correcto en registros_datos
ALTER TABLE registros_datos DROP CONSTRAINT IF EXISTS registros_datos_estado_check;
ALTER TABLE registros_datos ADD CONSTRAINT registros_datos_estado_check
  CHECK (estado IN ('borrador','en_revision','aprobado','rechazado','publicado'));

-- Columnas que pueden faltar en registros_datos
ALTER TABLE registros_datos ADD COLUMN IF NOT EXISTS revisado_por UUID REFERENCES auth.users(id);
ALTER TABLE registros_datos ADD COLUMN IF NOT EXISTS revisado_en TIMESTAMPTZ;
ALTER TABLE registros_datos ADD COLUMN IF NOT EXISTS publicado_en TIMESTAMPTZ;

-- Política: no se pueden eliminar registros publicados
DROP POLICY IF EXISTS "no eliminar publicados" ON registros_datos;
CREATE POLICY "no eliminar publicados" ON registros_datos FOR DELETE TO authenticated
  USING (estado != 'publicado');

-- RLS para audit_logs
DROP POLICY IF EXISTS "insertar auditoria" ON audit_logs;
CREATE POLICY "insertar auditoria" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "ver auditoria" ON audit_logs;
CREATE POLICY "ver auditoria" ON audit_logs FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()));

-- Vista para dashboard: emisiones mensuales
CREATE OR REPLACE VIEW vista_emisiones_mensuales AS
SELECT r.empresa_id, r.anio, r.mes, i.categoria,
  SUM(r.co2_calculado) as total_co2, COUNT(*) as total_registros
FROM registros_datos r
JOIN indicadores i ON i.id = r.indicador_id
WHERE r.estado IN ('aprobado','publicado') AND r.co2_calculado IS NOT NULL
GROUP BY r.empresa_id, r.anio, r.mes, i.categoria;

-- Actualizar factores de emisión y fuentes de los indicadores GRI
UPDATE indicadores SET
  fuente_factor = 'UPME - Unidad de Planeación Minero Energética (2023)',
  factor_emision = 0.000215
WHERE codigo = 'GRI 302-1';

UPDATE indicadores SET
  fuente_factor = 'GHG Protocol - Factor diésel Colombia (2023)',
  factor_emision = 0.00263
WHERE codigo = 'GRI 302-2';

UPDATE indicadores SET
  fuente_factor = 'GHG Protocol - Alcance 1 directo',
  factor_emision = 1.0
WHERE codigo = 'GRI 305-1';

UPDATE indicadores SET
  fuente_factor = 'GHG Protocol - Alcance 2 indirecto',
  factor_emision = 1.0
WHERE codigo = 'GRI 305-2';

UPDATE indicadores SET
  fuente_factor = 'GHG Protocol - Alcance 3 indirecto',
  factor_emision = 1.0
WHERE codigo = 'GRI 305-3';

-- Los siguientes NO tienen factor (correcto que sea NULL)
UPDATE indicadores SET
  fuente_factor = 'No aplica — indicador de volumen hídrico sin conversión CO₂',
  factor_emision = NULL
WHERE codigo IN ('GRI 303-1', 'GRI 303-3');

UPDATE indicadores SET
  fuente_factor = 'No aplica — indicador de masa de residuos sin conversión CO₂',
  factor_emision = NULL
WHERE codigo IN ('GRI 306-2', 'GRI 306-3', 'GRI 306-4');

UPDATE indicadores SET
  fuente_factor = 'No aplica — indicador de intensidad (ratio, no suma a total)',
  factor_emision = NULL
WHERE codigo IN ('GRI 302-3', 'GRI 305-4');
