# Dockerfile para desplegar en Coolify (VPS Ubuntu).
#
# Requisitos en Coolify:
#   - Build: este Dockerfile (Coolify lo detecta automáticamente)
#   - Variables de entorno: DATABASE_URL, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
#     (y SII_HOME opcional, ver abajo)
#   - Storage persistente: monta un volumen en /app/.sii para que la sesión
#     del SII (cookie jar) sobreviva a los redeploys.
#
# Nota sobre la BD: las migraciones de Prisma están desalineadas con el
# esquema real (histórico de db push; ver CONTEXTO.md §12.3). Por eso el
# entrypoint usa `prisma db push` (sincronización idempotente del esquema)
# en lugar de `prisma migrate deploy`. Cuando se arregle el historial de
# migraciones, cambia el entrypoint a `pnpm db:deploy`.

FROM node:22-bookworm-slim

# Playwright necesita estas dependencias de sistema para Chromium headless
# (las instala con --with-deps durante el build).
ENV NEXT_TELEMETRY_DISABLED=1
ENV SII_HOME=/app/.sii

WORKDIR /app

# pnpm via corepack (la versión fijada en package.json).
RUN corepack enable

# Dependencias: primero las de producción+build (capa cacheable).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Chromium para el login del SII (playwright). ~500 MB con deps de sistema.
RUN pnpm exec playwright install --with-deps chromium

# Código y build de producción.
COPY . .
RUN pnpm build

# Directorio de la sesión del SII (montar un volumen de Coolify aquí).
RUN mkdir -p /app/.sii

EXPOSE 3000

# Sincroniza el esquema (ver nota arriba) y levanta el servidor.
CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate && pnpm start -H 0.0.0.0"]
