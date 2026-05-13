-- ============================================================
-- ECOMETRICS — Schema completo v2
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. EMPRESAS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     TEXT NOT NULL,
  industria  TEXT,
  ciudad     TEXT,
  pais       TEXT DEFAULT 'Colombia',
  sector     TEXT,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS industria TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sector    TEXT;

-- ────────────────────────────────────────────────
-- 2. PERFILES (extiende auth.users)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfiles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  nombre     TEXT,
  email      TEXT,
  rol        TEXT CHECK (rol IN ('admin','editor','viewer','auditor')) DEFAULT 'viewer',
  activo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 3. CÓDIGOS DE INVITACIÓN
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codigos_invitacion (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id   UUID REFERENCES empresas(id) ON DELETE CASCADE,
  codigo       TEXT UNIQUE NOT NULL,
  creado_por   UUID REFERENCES auth.users(id),
  usado_por    UUID REFERENCES auth.users(id),
  rol_asignado TEXT DEFAULT 'editor',
  usado        BOOLEAN DEFAULT FALSE,
  expira_en    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 4. SEDES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sedes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  ciudad      TEXT,
  pais        TEXT DEFAULT 'Colombia',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 5. INSTALACIONES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instalaciones (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sede_id    UUID REFERENCES sedes(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  tipo       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 6. ESTÁNDARES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estandares (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

INSERT INTO estandares (nombre, descripcion)
VALUES ('GRI', 'Global Reporting Initiative')
ON CONFLICT (nombre) DO NOTHING;

-- ────────────────────────────────────────────────
-- 7. INDICADORES GRI
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS indicadores (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estandar_id    UUID REFERENCES estandares(id),
  codigo         TEXT NOT NULL UNIQUE,
  nombre         TEXT NOT NULL,
  unidad         TEXT NOT NULL,
  factor_emision NUMERIC,
  alcance        TEXT CHECK (alcance IN ('alcance_1','alcance_2','alcance_3')),
  categoria      TEXT CHECK (categoria IN ('energia','agua','residuos','emisiones')),
  descripcion    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO indicadores (estandar_id, codigo, nombre, unidad, factor_emision, alcance, categoria, descripcion)
SELECT e.id, t.codigo, t.nombre, t.unidad, t.factor_emision::NUMERIC, t.alcance, t.categoria, t.descripcion
FROM estandares e,
(VALUES
  ('GRI 302-1', 'Consumo de energía eléctrica',              'kWh',         '0.000215',  'alcance_2', 'energia',  'Electricidad consumida dentro de la organización.'),
  ('GRI 302-2', 'Consumo de energía en combustibles',        'litros',      '0.002630',  'alcance_1', 'energia',  'Combustibles fósiles usados en operaciones propias.'),
  ('GRI 302-3', 'Intensidad energética',                     'kWh/unidad',  NULL,        'alcance_2', 'energia',  'Ratio de consumo energético por unidad de producción.'),
  ('GRI 303-1', 'Consumo total de agua',                     'm3',          NULL,        'alcance_3', 'agua',     'Volumen total de agua extraída de todas las fuentes.'),
  ('GRI 303-3', 'Agua reciclada y reutilizada',              'm3',          NULL,        'alcance_3', 'agua',     'Agua recirculada o reutilizada en procesos internos.'),
  ('GRI 305-1', 'Emisiones directas GEI (Alcance 1)',        'tCO2e',       '1',         'alcance_1', 'emisiones','Emisiones de GEI de fuentes controladas por la organización.'),
  ('GRI 305-2', 'Emisiones indirectas energía (Alcance 2)',  'tCO2e',       '1',         'alcance_2', 'emisiones','Emisiones de GEI por electricidad o energía comprada.'),
  ('GRI 305-3', 'Otras emisiones indirectas (Alcance 3)',    'tCO2e',       '1',         'alcance_3', 'emisiones','Emisiones indirectas en la cadena de valor.'),
  ('GRI 305-4', 'Intensidad de emisiones GEI',               'tCO2e/unidad','1',         'alcance_1', 'emisiones','Ratio de emisiones por unidad de negocio relevante.'),
  ('GRI 306-2', 'Residuos generados',                        'kg',          NULL,        'alcance_3', 'residuos', 'Peso total de residuos sólidos producidos.'),
  ('GRI 306-3', 'Residuos desviados de disposición',         'kg',          NULL,        'alcance_3', 'residuos', 'Residuos enviados a reciclaje, compostaje u otras vías.'),
  ('GRI 306-4', 'Residuos enviados a disposición',           'kg',          NULL,        'alcance_3', 'residuos', 'Residuos dispuestos en rellenos o vertederos.')
) AS t(codigo, nombre, unidad, factor_emision, alcance, categoria, descripcion)
WHERE e.nombre = 'GRI'
ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────
-- 8. REGISTROS DE DATOS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_datos (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id     UUID REFERENCES empresas(id) ON DELETE CASCADE,
  sede_id        UUID REFERENCES sedes(id) ON DELETE SET NULL,
  instalacion_id UUID REFERENCES instalaciones(id) ON DELETE SET NULL,
  indicador_id   UUID REFERENCES indicadores(id),
  usuario_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  valor          NUMERIC NOT NULL,
  co2_calculado  NUMERIC,
  anio           INTEGER NOT NULL,
  mes            INTEGER CHECK (mes BETWEEN 1 AND 12),
  estado         TEXT CHECK (estado IN ('borrador','en_revision','aprobado','rechazado')) DEFAULT 'borrador',
  notas          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibilidad: si columna vieja existe, renombrar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registros_datos' AND column_name='user_id') THEN
    ALTER TABLE registros_datos RENAME COLUMN user_id TO usuario_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registros_datos' AND column_name='co2_equivalente') THEN
    ALTER TABLE registros_datos RENAME COLUMN co2_equivalente TO co2_calculado;
  END IF;
END $$;

-- ────────────────────────────────────────────────
-- 9. EVIDENCIAS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidencias (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id    UUID REFERENCES registros_datos(id) ON DELETE CASCADE,
  nombre_archivo TEXT,
  url_archivo    TEXT,
  tipo_archivo   TEXT,
  subido_por     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 10. AUDIT LOGS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id),
  usuario_id UUID REFERENCES auth.users(id),
  accion     TEXT NOT NULL,
  tabla      TEXT,
  registro_id UUID,
  detalle    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 11. MIEMBROS EMPRESA (legacy — mantener por compatibilidad)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS miembros_empresa (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id   UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT NOT NULL,
  rol          TEXT DEFAULT 'colaborador',
  estado       TEXT DEFAULT 'pendiente',
  invitado_por UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, email)
);

-- ────────────────────────────────────────────────
-- 12. ÍNDICES
-- ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_empresas_user_id         ON empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_user_id         ON perfiles(user_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_empresa_id      ON perfiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_codigos_empresa_id       ON codigos_invitacion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_codigos_codigo           ON codigos_invitacion(codigo);
CREATE INDEX IF NOT EXISTS idx_sedes_empresa_id         ON sedes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_sede_id    ON instalaciones(sede_id);
CREATE INDEX IF NOT EXISTS idx_registros_empresa_id     ON registros_datos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_usuario_id     ON registros_datos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_indicador_id   ON registros_datos(indicador_id);
CREATE INDEX IF NOT EXISTS idx_registros_anio           ON registros_datos(anio);
CREATE INDEX IF NOT EXISTS idx_audit_empresa_id         ON audit_logs(empresa_id);

-- ────────────────────────────────────────────────
-- 13. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────

-- Empresas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empresas_owner_v2" ON empresas;
CREATE POLICY "empresas_owner_v2" ON empresas
  FOR ALL USING (
    user_id = auth.uid()
    OR id IN (SELECT empresa_id FROM perfiles WHERE user_id = auth.uid())
  );

-- Perfiles: cada usuario ve el suyo + admins ven los de su empresa
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_self" ON perfiles;
CREATE POLICY "perfiles_self" ON perfiles
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "perfiles_admin_empresa" ON perfiles;
CREATE POLICY "perfiles_admin_empresa" ON perfiles
  FOR SELECT USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
    )
  );

-- Códigos de invitación
ALTER TABLE codigos_invitacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "codigos_admin" ON codigos_invitacion;
CREATE POLICY "codigos_admin" ON codigos_invitacion
  FOR ALL USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "codigos_public_read" ON codigos_invitacion;
CREATE POLICY "codigos_public_read" ON codigos_invitacion
  FOR SELECT USING (NOT usado AND expira_en > NOW());

-- Sedes
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sedes_empresa" ON sedes;
CREATE POLICY "sedes_empresa" ON sedes
  FOR ALL USING (
    empresa_id IN (
      SELECT COALESCE(p.empresa_id, e.id)
      FROM empresas e
      LEFT JOIN perfiles p ON p.user_id = auth.uid()
      WHERE e.user_id = auth.uid() OR p.empresa_id IS NOT NULL
    )
  );

-- Instalaciones
ALTER TABLE instalaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "instalaciones_via_sede" ON instalaciones;
CREATE POLICY "instalaciones_via_sede" ON instalaciones
  FOR ALL USING (
    sede_id IN (
      SELECT s.id FROM sedes s
      JOIN empresas e ON s.empresa_id = e.id
      WHERE e.user_id = auth.uid()
      UNION
      SELECT s.id FROM sedes s
      JOIN perfiles p ON s.empresa_id = p.empresa_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Indicadores: lectura pública
ALTER TABLE indicadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_public_read" ON indicadores;
CREATE POLICY "indicadores_public_read" ON indicadores
  FOR SELECT USING (true);

-- Estándares: lectura pública
ALTER TABLE estandares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "estandares_public_read" ON estandares;
CREATE POLICY "estandares_public_read" ON estandares
  FOR SELECT USING (true);

-- Registros de datos
ALTER TABLE registros_datos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_owner_v2" ON registros_datos;
CREATE POLICY "registros_owner_v2" ON registros_datos
  FOR ALL USING (
    usuario_id = auth.uid()
    OR empresa_id IN (
      SELECT COALESCE(p.empresa_id, e.id)
      FROM empresas e
      LEFT JOIN perfiles p ON p.user_id = auth.uid()
      WHERE e.user_id = auth.uid() OR p.empresa_id IS NOT NULL
    )
  );

-- Evidencias
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evidencias_owner" ON evidencias;
CREATE POLICY "evidencias_owner" ON evidencias
  FOR ALL USING (
    registro_id IN (
      SELECT id FROM registros_datos WHERE usuario_id = auth.uid()
    )
  );

-- Audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_empresa" ON audit_logs;
CREATE POLICY "audit_empresa" ON audit_logs
  FOR SELECT USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
      UNION
      SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()
    )
  );

-- Miembros empresa (legacy)
ALTER TABLE miembros_empresa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "miembros_empresa_owner" ON miembros_empresa;
CREATE POLICY "miembros_empresa_owner" ON miembros_empresa
  FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- ────────────────────────────────────────────────
-- 14. TRIGGERS updated_at
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_empresas_updated_at   ON empresas;
DROP TRIGGER IF EXISTS trg_perfiles_updated_at   ON perfiles;
DROP TRIGGER IF EXISTS trg_registros_updated_at  ON registros_datos;

CREATE TRIGGER trg_empresas_updated_at  BEFORE UPDATE ON empresas        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_perfiles_updated_at  BEFORE UPDATE ON perfiles        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_registros_updated_at BEFORE UPDATE ON registros_datos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
