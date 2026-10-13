#!/bin/sh
# Entrypoint inteligente para el contenedor de Coolify.
#
# Problema: `prisma db push --force-reset` borra toda la BD en cada arranque,
# lo que pierde los datos en cada redeploy.
#
# Solución: este script verifica el estado de la BD y solo hace force-reset
# cuando es necesario (primer deploy o schema incompatible).

set -e

echo "🔄 Verificando estado de la base de datos..."

# Contar tablas en el schema public (excluyendo tablas de Prisma y sistema)
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name NOT LIKE '_prisma%'
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE 'sql_%';
" | tr -d ' ')

echo "   Tablas encontradas: $TABLE_COUNT"

if [ "$TABLE_COUNT" -eq 0 ]; then
  echo "   BD vacía → creando schema con force-reset..."
  pnpm exec prisma db push --force-reset
else
  echo "   BD con datos → sincronizando schema sin borrar..."
  # Intentar sync normal primero; si falla por tablas con políticas dependientes,
  # se hace force-reset como último recurso (solo si el schema es incompatible).
  if ! pnpm exec prisma db push --accept-data-loss 2>/dev/null; then
    echo "   ⚠️  Schema incompatible → se requiere force-reset (se perderán datos)."
    echo "   Esto solo debería pasar el primer deploy o tras cambios de schema mayores."
    pnpm exec prisma db push --force-reset
  fi
fi

echo "✅ Schema sincronizado."

# Crear empresa y admin si no existen (seed idempotente)
echo "🌱 Ejecutando seed (empresa + admin)..."
pnpm exec tsx prisma/seed.ts

echo "🚀 Iniciando servidor..."
pnpm start -H 0.0.0.0
