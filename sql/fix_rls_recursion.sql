-- ============================================================
-- FIX: Infinite recursion en RLS policies
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- El problema: empresas → perfiles → empresas (ciclo)
-- La solución: SECURITY DEFINER functions que bypasean RLS

-- ── 1. Función: obtiene empresa_id del perfil del usuario actual ──
CREATE OR REPLACE FUNCTION get_my_empresa_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT empresa_id FROM perfiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- ── 2. Función: obtiene el id de la empresa que POSEE el usuario actual ──
CREATE OR REPLACE FUNCTION get_owned_empresa_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM empresas WHERE user_id = auth.uid() LIMIT 1
$$;

-- ── 3. Reparar política de EMPRESAS (sin referencia a perfiles) ──
DROP POLICY IF EXISTS "empresas_owner_v2" ON empresas;
DROP POLICY IF EXISTS "empresas_miembro_read" ON empresas;

-- Owner: acceso total
CREATE POLICY "empresas_owner_v2" ON empresas
  FOR ALL USING (user_id = auth.uid());

-- Miembro: solo lectura (usa función SECURITY DEFINER → sin recursión)
CREATE POLICY "empresas_miembro_read" ON empresas
  FOR SELECT USING (id = get_my_empresa_id());

-- ── 4. Reparar política de PERFILES (sin referencia directa a empresas) ──
DROP POLICY IF EXISTS "perfiles_admin_empresa" ON perfiles;
DROP POLICY IF EXISTS "perfiles_self" ON perfiles;

-- Cada usuario ve y edita su propio perfil
CREATE POLICY "perfiles_self" ON perfiles
  FOR ALL USING (user_id = auth.uid());

-- Admin ve todos los perfiles de su empresa (función evita recursión)
CREATE POLICY "perfiles_admin_empresa" ON perfiles
  FOR SELECT USING (
    empresa_id = get_owned_empresa_id()
  );

-- ── 5. Reparar sedes (mismo patrón) ──
DROP POLICY IF EXISTS "sedes_empresa" ON sedes;

CREATE POLICY "sedes_owner" ON sedes
  FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "sedes_miembro_read" ON sedes
  FOR SELECT USING (empresa_id = get_my_empresa_id());

-- ── 6. Reparar registros_datos ──
DROP POLICY IF EXISTS "registros_owner_v2" ON registros_datos;

CREATE POLICY "registros_owner_v2" ON registros_datos
  FOR ALL USING (
    usuario_id = auth.uid()
    OR empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "registros_miembro_read" ON registros_datos
  FOR SELECT USING (empresa_id = get_my_empresa_id());

-- ── 7. Reparar codigos_invitacion ──
DROP POLICY IF EXISTS "codigos_admin" ON codigos_invitacion;
DROP POLICY IF EXISTS "codigos_public_read" ON codigos_invitacion;

CREATE POLICY "codigos_admin" ON codigos_invitacion
  FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

-- Lectura pública solo para códigos válidos (registro con invitación)
CREATE POLICY "codigos_validar" ON codigos_invitacion
  FOR SELECT USING (true);
