-- ============================================================
-- ECOMETRICS — Adiciones Schema v3
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema base
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. FUNCIÓN: Generar código de invitación único
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generar_codigo_invitacion(empresa_uuid UUID, rol TEXT)
RETURNS TEXT AS $$
DECLARE
  codigo TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  LOOP
    codigo := 'ECO-' || EXTRACT(YEAR FROM NOW()) || '-';
    FOR i IN 1..4 LOOP
      codigo := codigo || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM codigos_invitacion WHERE codigos_invitacion.codigo = codigo);
  END LOOP;

  INSERT INTO codigos_invitacion (empresa_id, codigo, rol_asignado)
  VALUES (empresa_uuid, codigo, rol);

  RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 2. VISTA: Emisiones mensuales por empresa
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vista_emisiones_mensuales AS
SELECT
  r.empresa_id,
  r.anio,
  r.mes,
  i.categoria,
  SUM(r.co2_calculado)  AS total_co2,
  COUNT(*)              AS total_registros
FROM registros_datos r
JOIN indicadores i ON i.id = r.indicador_id
WHERE r.estado IN ('aprobado', 'publicado')
  AND r.co2_calculado IS NOT NULL
GROUP BY r.empresa_id, r.anio, r.mes, i.categoria;

-- ─────────────────────────────────────────────────────────────
-- 3. VISTA: Resumen por sede
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vista_resumen_sedes AS
SELECT
  s.empresa_id,
  s.id             AS sede_id,
  s.nombre         AS sede_nombre,
  s.ciudad,
  COUNT(r.id)      AS total_registros,
  SUM(r.co2_calculado) AS total_co2,
  MAX(r.created_at)    AS ultima_actividad
FROM sedes s
LEFT JOIN registros_datos r ON r.sede_id = s.id
  AND r.estado IN ('aprobado', 'publicado')
GROUP BY s.empresa_id, s.id, s.nombre, s.ciudad;

-- ─────────────────────────────────────────────────────────────
-- 4. COLUMNAS opcionales en empresas (si no existen)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='notificar_revision') THEN
    ALTER TABLE empresas ADD COLUMN notificar_revision BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='notificar_rechazo') THEN
    ALTER TABLE empresas ADD COLUMN notificar_rechazo BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. RLS para vistas
-- ─────────────────────────────────────────────────────────────
-- Las vistas heredan las políticas de las tablas base.
-- Si se necesita acceso directo, crear security definer functions.

-- ─────────────────────────────────────────────────────────────
-- 6. FUNCIÓN: Estadísticas rápidas por empresa (usada en dashboard)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_empresa_stats(empresa_uuid UUID)
RETURNS TABLE (
  total_registros BIGINT,
  total_co2       NUMERIC,
  total_sedes     BIGINT,
  indicadores_usados BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(r.id)::BIGINT                                      AS total_registros,
    COALESCE(SUM(r.co2_calculado), 0)                       AS total_co2,
    (SELECT COUNT(*) FROM sedes s WHERE s.empresa_id = empresa_uuid)::BIGINT AS total_sedes,
    COUNT(DISTINCT r.indicador_id)::BIGINT                  AS indicadores_usados
  FROM registros_datos r
  WHERE r.empresa_id = empresa_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 7. ÍNDICES adicionales para rendimiento
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_registros_empresa_anio  ON registros_datos (empresa_id, anio);
CREATE INDEX IF NOT EXISTS idx_registros_empresa_estado ON registros_datos (empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_registros_sede_estado    ON registros_datos (sede_id, estado);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario   ON notificaciones (usuario_id, leida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario       ON audit_logs (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_codigos_empresa          ON codigos_invitacion (empresa_id, usado, expira_en);

-- ─────────────────────────────────────────────────────────────
-- 8. TRIGGER: Auto-crear notificación al cambiar estado de registro
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notificar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actuar cuando cambia el estado
  IF OLD.estado = NEW.estado THEN RETURN NEW; END IF;

  -- Notificar al dueño del registro si no es quien lo cambió
  IF NEW.usuario_id IS NOT NULL AND NEW.usuario_id != NEW.revisado_por THEN
    INSERT INTO notificaciones (usuario_id, empresa_id, tipo, mensaje, registro_id)
    VALUES (
      NEW.usuario_id,
      NEW.empresa_id,
      NEW.estado,
      CASE NEW.estado
        WHEN 'aprobado'  THEN 'Tu registro fue aprobado.'
        WHEN 'publicado' THEN 'Tu registro fue publicado.'
        WHEN 'rechazado' THEN 'Tu registro fue rechazado.'
        ELSE 'Tu registro cambió a estado: ' || NEW.estado
      END,
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_estado ON registros_datos;
CREATE TRIGGER trg_notificar_estado
  AFTER UPDATE OF estado ON registros_datos
  FOR EACH ROW EXECUTE FUNCTION notificar_cambio_estado();
