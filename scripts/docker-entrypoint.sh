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
node scripts/prisma-run.mjs migrate deploy

# Crear empresa y admin si no existen (seed idempotente).
echo "🌱 Ejecutando seed (empresa + admin)..."
pnpm exec tsx prisma/seed.ts

echo "🚀 Iniciando servidor..."
pnpm start -H 0.0.0.0
