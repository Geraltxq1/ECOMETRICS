-- ────────────────────────────────────────────────
-- V4 — Transparencia de cálculo + catálogo GRI documentado
-- ────────────────────────────────────────────────

-- 1. Transparencia del factor de emisión
ALTER TABLE indicadores ADD COLUMN IF NOT EXISTS fuente_factor TEXT;
ALTER TABLE indicadores ADD COLUMN IF NOT EXISTS factor_actualizado_en TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE indicadores ADD COLUMN IF NOT EXISTS factor_actualizado_por UUID REFERENCES auth.users(id);

UPDATE indicadores SET fuente_factor = 'UPME - Unidad de Planeación Minero Energética (2023)'
WHERE codigo IN ('GRI 302-1', 'GRI 302-2');

UPDATE indicadores SET fuente_factor = 'GHG Protocol - Corporate Standard'
WHERE codigo LIKE 'GRI 305%';

-- 2. Catálogo GRI como decisión de producto, no limitación técnica
ALTER TABLE indicadores ADD COLUMN IF NOT EXISTS fase_recomendada TEXT DEFAULT 'fase_1';
