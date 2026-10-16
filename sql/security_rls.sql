-- ══════════════════════════════════════════════════════════════
-- ECØMETRICS — Políticas RLS de Seguridad
-- [4] Row-Level Security | [7] Acceso a datos propios | [8] Campos protegidos
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM perfiles WHERE user_id = auth.uid() AND activo = TRUE LIMIT 1;
  RETURN v_empresa_id;
END; $$;

CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM perfiles WHERE user_id = auth.uid() AND activo = TRUE LIMIT 1;
  RETURN v_rol;
END; $$;

-- [4] Habilitar RLS
ALTER TABLE empresas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE estandares         ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_invitacion ENABLE ROW LEVEL SECURITY;

-- Empresas
DROP POLICY IF EXISTS "empresas_select_propia" ON empresas;
CREATE POLICY "empresas_select_propia" ON empresas FOR SELECT USING (id = get_user_empresa_id());
DROP POLICY IF EXISTS "empresas_update_admin" ON empresas;
CREATE POLICY "empresas_update_admin" ON empresas FOR UPDATE
  USING (id = get_user_empresa_id() AND get_user_rol() = 'admin')
  WITH CHECK (id = get_user_empresa_id());
DROP POLICY IF EXISTS "empresas_insert_service" ON empresas;
CREATE POLICY "empresas_insert_service" ON empresas FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Perfiles
DROP POLICY IF EXISTS "perfiles_select" ON perfiles;
CREATE POLICY "perfiles_select" ON perfiles FOR SELECT USING (
  user_id = auth.uid() OR (empresa_id = get_user_empresa_id() AND get_user_rol() IN ('admin','auditor'))
);
DROP POLICY IF EXISTS "perfiles_update_propio" ON perfiles;
CREATE POLICY "perfiles_update_propio" ON perfiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "perfiles_insert_service" ON perfiles;
CREATE POLICY "perfiles_insert_service" ON perfiles FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Sedes
DROP POLICY IF EXISTS "sedes_empresa" ON sedes;
CREATE POLICY "sedes_empresa" ON sedes FOR ALL
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id() AND get_user_rol() IN ('admin','editor'));

-- Códigos de invitación
DROP POLICY IF EXISTS "codigos_select_admin" ON codigos_invitacion;
CREATE POLICY "codigos_select_admin" ON codigos_invitacion FOR SELECT
  USING (empresa_id = get_user_empresa_id() AND get_user_rol() = 'admin');
DROP POLICY IF EXISTS "codigos_service_role" ON codigos_invitacion;
CREATE POLICY "codigos_service_role" ON codigos_invitacion FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Indicadores y estándares (lectura autenticada)
DROP POLICY IF EXISTS "indicadores_auth" ON indicadores;
CREATE POLICY "indicadores_auth" ON indicadores FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "estandares_auth" ON estandares;
CREATE POLICY "estandares_auth" ON estandares FOR SELECT USING (auth.uid() IS NOT NULL);

-- Storage: bucket "Evidencias"
DROP POLICY IF EXISTS "evidencias_select" ON storage.objects;
CREATE POLICY "evidencias_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'Evidencias' AND auth.uid() IS NOT NULL
  AND ((storage.foldername(name))[2] = auth.uid()::TEXT OR get_user_rol() = 'admin')
);
DROP POLICY IF EXISTS "evidencias_insert" ON storage.objects;
CREATE POLICY "evidencias_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'Evidencias' AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::TEXT
  AND lower(storage.extension(name)) IN ('pdf','jpg','jpeg','png','webp','docx','xlsx','csv')
);
DROP POLICY IF EXISTS "evidencias_delete" ON storage.objects;
CREATE POLICY "evidencias_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'Evidencias' AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::TEXT
);
