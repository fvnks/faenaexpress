# Reemplazar el build de `yellow-erp.cl` por esta app

**Estado al 20-10-2026:** `yellow-erp.cl` lo sirve **otra app** (la landing de marketing con un panel de
muestra), no este repo. Este repo (Facturas / Yellow ERP) está desplegado en **`erp.faenaexpress.cl`**.
Los dos están en el mismo VPS de Coolify (`148.113.196.87`).

La topología objetivo ya está decidida en `PLAN-SAAS.md` §7.1: **un código, dos despliegues**.

| | Instalación de la empresa actual | Yellow ERP (SaaS) |
| --- | --- | --- |
| Dominio | `erp.faenaexpress.cl` (como hoy) | `yellow-erp.cl` |
| Perfil | `DEPLOYMENT_PROFILE=standalone` | `DEPLOYMENT_PROFILE=saas` |
| Base de datos | la misma (aislamiento por fila) | la misma |

## Lo que hay que saber antes de tocar nada

- **El DNS no se toca.** `yellow-erp.cl` y `www.yellow-erp.cl` ya resuelven y están **detrás de
  Cloudflare** (104.21.91.130 / 172.67.219.205) que hace de proxy hacia el VPS. Comprobado: pidiendo
  `https://148.113.196.87/` con `Host: yellow-erp.cl` se sirve el mismo contenido.
- **Traefik enruta por `Host`**: un dominio puede estar en **un solo** servicio. Por eso hay que
  **quitarlo del recurso viejo antes de ponerlo en el nuevo** (si no, el certificado y el enrutamiento
  se pelean).
- **La base es la misma y las migraciones no se repiten**: el `Session` es el mismo y la fila de
  `PlatformStaff` (el OWNER de plataforma) es la misma. El despliegue nuevo no la duplica: la tabla se
  indexa por `userId` y es única.
- **Volumen de la sesión del SII**: hay que montar el mismo volumen en `/app/.sii` en el despliegue
  nuevo, o se pierde la sesión iniciada en el portal del SII.
- **El otro proyecto no se borra**: queda con su base y su contenido, pero sin el dominio. Si su
  contenido (Precios, FAQ, etc.) vale la pena, se reconstruye dentro de la landing de este repo — hoy
  la landing tiene hero, el problema, qué hace y módulos, pero **no** tiene precios.

## Pasos (en Coolify)

1. **Identificar el recurso viejo** que tiene `yellow-erp.cl` en su lista de dominios.
2. **Quitarle el dominio** (`yellow-erp.cl` y `www.yellow-erp.cl`). Guardar. Con esto el dominio queda
   libre y Traefik deja de enrutar hacia esa app.
3. **Crear un recurso nuevo** con:
   - **Origen**: el mismo repositorio (`fvnks/faenaexpress`), rama `main`.
   - **Build**: el mismo Dockerfile (`pnpm build`). El entrypoint aplica `pnpm db:deploy` y el seed.
   - **Variables de entorno**: las mismas que tiene hoy `erp.faenaexpress.cl`, más:
     - `DEPLOYMENT_PROFILE=saas` → en `/` se muestra la landing pública en vez de redirigir al login.
     - `PLATFORM_STAFF_EMAIL=r.droguett@faenaexpress.cl` → el seed deja el OWNER de plataforma.
   - **Volumen**: el mismo de `/app/.sii`.
4. **Agregar el dominio** `yellow-erp.cl` (y `www.yellow-erp.cl` si se quiere; conviene que `www`
   redirija al apex). Coolify emite el TLS de Let's Encrypt al guardar.
5. **Desplegar.** La primera vez tarda (build completo con Chromium).

## Verificar

| Comprobación | Resultado esperado |
| --- | --- |
| `https://yellow-erp.cl/` | La landing de Yellow ERP (perfil `saas`) |
| `https://yellow-erp.cl/login` | El login real de la app |
| `https://yellow-erp.cl/admin` | Redirige a `/login` sin sesión; con sesión de staff, el tablero |
| `https://erp.faenaexpress.cl/` | Sigue funcionando la instalación del cliente, **con sus datos** |
| `https://erp.faenaexpress.cl/admin` | La consola de operador (mismo `PlatformStaff`) |

- Que las dos sirvan los **mismos datos** es lo correcto: es una base con aislamiento por fila.
- Si el despliegue nuevo mostrara un `/` con el login en vez de la landing, falta
  `DEPLOYMENT_PROFILE=saas`.

## Lo que NO es parte de este cambio

- `admin.yellow-erp.cl` (el subdominio de la consola) es un paso aparte, para cuando la consola esté
  probada. Ver `PLAN-ADMIN.md` §6b.
- Los planes y el cobro (Fase D) no se tocan aquí.
