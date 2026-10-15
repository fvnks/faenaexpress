# Dockerfile para desplegar en Coolify (VPS Ubuntu).
#
# Requisitos en Coolify:
#   - Build: este Dockerfile (Coolify lo detecta automáticamente)
#   - Variables de entorno (ver abajo): DATABASE_URL es la única obligatoria;
#     el resto crea el admin y la empresa en el primer arranque (el seed es
#     idempotente: si ya existen, no toca nada).
#   - Storage persistente: monta un volumen en /app/.sii para que la sesión
#     del SII (cookie jar) sobreviva a los redeploys.
#
# Variables:
#   DATABASE_URL      postgres://usuario:password@host:5432/bd  (obligatoria)
#   SII_SECRET_KEY    llave para cifrar las credenciales del SII (AES-256-GCM).
#                     Si no se define, el guardado de credenciales SII se
#                     desactiva con un aviso; el resto funciona igual.
#   ADMIN_NAME        nombre del admin (default: "Administrador")
#   ADMIN_EMAIL       correo del admin (default: admin@facturas.local)
#   ADMIN_PASSWORD    contraseña del admin (default: cambiar-esto-123)
#   COMPANY_NAME      nombre de la empresa inicial (default: "Mi Empresa")
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

# Chromium de sistema para el SII (evita descargar/importar Playwright en cada build).
# Se usa desde Playwright mediante PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
  && rm -rf /var/lib/apt/lists/*
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Código y build de producción.
COPY . .
RUN pnpm build

# Directorio de la sesión del SII (montar un volumen de Coolify aquí).
RUN mkdir -p /app/.sii

EXPOSE 3000

# Entrypoint inteligente: sincroniza el schema sin borrar datos en redeploys.
# El script verifica el estado de la BD y solo hace force-reset cuando es
# necesario (primer deploy o schema incompatible).
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
CMD ["sh", "/app/docker-entrypoint.sh"]
