#!/bin/sh
# Entrypoint del contenedor (Coolify).
#
# Aplica las migraciones con `prisma migrate deploy` y siembra el admin/empresa.
# Historia: antes esto hacía `prisma db push` (y un `--force-reset` como último recurso), lo que
# podía borrar toda la base en un redeploy. Desde el baseline `0_init` las migraciones cubren el
# schema completo, así que `migrate deploy` es seguro e idempotente: solo aplica lo pendiente.
#
# Ojo: si la base viene de la época de `db push`, primero hay que basearla una vez
# (`pnpm db:baseline --si`); si no, `migrate deploy` falla porque el historial registrado no
# coincide con `prisma/migrations`. Falla ruidosamente a propósito: nunca resetea datos.
set -e

echo "🔄 Aplicando migraciones..."

# Resolver migraciones falladas conocidas (idempotente: si ya está resuelta, no hace nada).
# Estas migraciones fallaron en producción pero su schema coincide con el actual.
# Módulo Colegios: migraciones renombradas/creadas tras baseline 0_init.
node scripts/prisma-run.mjs migrate resolve --applied "20261026175000_school_calendar" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026175500_school_staff" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026220000_school_grades" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026221000_subject_promotion_flag" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026230000_enrollment_history" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026240000_student_documents" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026250000_guardian_portal" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026260000_school_communication" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026270000_school_convivencia" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026271000_denuncia_anonima" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026280000_promotion_resolution" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026290000_school_slug" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261026290000_school_signature" 2>/dev/null || true
# Módulo POS: migraciones SII
node scripts/prisma-run.mjs migrate resolve --applied "20261102000000_pos_sii_config" 2>/dev/null || true
node scripts/prisma-run.mjs migrate resolve --applied "20261103000000_pos_sii_indexes" 2>/dev/null || true

node scripts/prisma-run.mjs migrate deploy

# Crear empresa y admin si no existen (seed idempotente).
echo "🌱 Ejecutando seed (empresa + admin)..."
pnpm exec tsx prisma/seed.ts

echo "🚀 Iniciando servidor..."
pnpm start -H 0.0.0.0
