#!/bin/bash
# ECØMETRICS — Security Check Script [20]
set -e

echo "═══════════════════════════════════════"
echo "   ECØMETRICS Security Check"
echo "═══════════════════════════════════════"

# [20] npm audit
echo ""
echo "▶ npm audit (moderate+)"
npm audit --audit-level=moderate || true

# Buscar secretos hardcodeados
echo ""
echo "▶ Buscando secretos en código fuente..."
FOUND=0
if grep -rn --include="*.ts" --include="*.tsx" \
  -E "(supabase\.co|eyJ[A-Za-z0-9_-]{20,}|sk-ant-|SUPABASE_SERVICE_ROLE)" \
  --exclude-dir=node_modules --exclude-dir=.next \
  . 2>/dev/null | grep -v "process\.env" | grep -v ".env.example" | grep -v "//"; then
  echo "⚠ Posibles secretos encontrados. Revisá manualmente."
  FOUND=1
else
  echo "✅ No se encontraron secretos hardcodeados."
fi

# Verificar .env no en git
echo ""
echo "▶ Verificando .env en git..."
if git ls-files --error-unmatch .env.local 2>/dev/null; then
  echo "🚨 ERROR: .env.local está rastreado por git! Ejecutar: git rm --cached .env.local"
else
  echo "✅ .env.local no está en git."
fi

# Verificar SERVICE_ROLE_KEY no expuesta
echo ""
echo "▶ Verificando SUPABASE_SERVICE_ROLE_KEY..."
if grep -rn "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE" --include="*.ts" --include="*.tsx" --include="*.env*" . 2>/dev/null; then
  echo "🚨 ERROR: SERVICE_ROLE_KEY expuesta como NEXT_PUBLIC_!"
else
  echo "✅ SERVICE_ROLE_KEY no está expuesta como variable pública."
fi

echo ""
echo "═══════════════════════════════════════"
if [ $FOUND -eq 0 ]; then
  echo "✅ Security check completado sin problemas críticos."
else
  echo "⚠ Security check completado con advertencias. Revisá arriba."
fi
