-- ============================================================
-- ECOMETRICS — Adiciones al schema (flujo revisión + notificaciones)
-- Ejecutar en Supabase SQL Editor DESPUÉS de schema.sql
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. Columnas adicionales en registros_datos
-- ────────────────────────────────────────────────
ALTER TABLE registros_datos ADD COLUMN IF NOT EXISTS publicado_en  TIMESTAMPTZ;
ALTER TABLE registros_datos ADD COLUMN IF NOT EXISTS revisado_por  UUID REFERENCES auth.users(id);
ALTER TABLE registros_datos ADD COLUMN IF NOT EXISTS revisado_en   TIMESTAMPTZ;
ALTER TABLE registros_datos ADD COLUMN IF NOT EXISTS enviado_por   UUID REFERENCES auth.users(id);
ALTER TABLE registros_datos ADD COLUMN IF NOT EXISTS enviado_en    TIMESTAMPTZ;

-- ────────────────────────────────────────────────
-- 2. Tabla comentarios_revision
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comentarios_revision (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES registros_datos(id) ON DELETE CASCADE NOT NULL,
  usuario_id  UUID REFERENCES auth.users(id),
  comentario  TEXT NOT NULL,
  accion      TEXT CHECK (accion IN ('enviado','aprobado','rechazado','publicado')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comentarios_revision ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comentarios_empresa" ON comentarios_revision;
CREATE POLICY "comentarios_empresa" ON comentarios_revision
  FOR ALL USING (
    registro_id IN (
      SELECT id FROM registros_datos
      WHERE empresa_id IN (
        SELECT id FROM empresas WHERE user_id = auth.uid()
        UNION
        SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────
-- 3. Tabla notificaciones
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa_id  UUID REFERENCES empresas(id),
  tipo        TEXT NOT NULL,
  mensaje     TEXT NOT NULL,
  leida       BOOLEAN DEFAULT FALSE,
  registro_id UUID REFERENCES registros_datos(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida   ON notificaciones(usuario_id, leida);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificaciones_owner" ON notificaciones;
CREATE POLICY "notificaciones_owner" ON notificaciones
  FOR ALL USING (usuario_id = auth.uid());

-- ────────────────────────────────────────────────
-- 4. Storage bucket para evidencias
-- ────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidencias',
  'evidencias',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "evidencias_upload" ON storage.objects;
CREATE POLICY "evidencias_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'evidencias' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "evidencias_read" ON storage.objects;
CREATE POLICY "evidencias_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'evidencias');

DROP POLICY IF EXISTS "evidencias_delete" ON storage.objects;
CREATE POLICY "evidencias_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'evidencias' AND auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────
-- 5. RLS evidencias tabla: acceso para revisores
--    (reemplaza la política solo-dueño original)
-- ────────────────────────────────────────────────
DROP POLICY IF EXISTS "evidencias_owner" ON evidencias;
CREATE POLICY "evidencias_empresa" ON evidencias
  FOR ALL USING (
    registro_id IN (
      SELECT id FROM registros_datos
      WHERE usuario_id = auth.uid()
         OR empresa_id IN (
           SELECT id FROM empresas WHERE user_id = auth.uid()
           UNION
           SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()
         )
    )
  );
