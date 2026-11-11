# CONTEXTO.md — Proyecto Facturas ERP

## Estado actual (2026-11-11)

### Últimos commits (todos en GitHub `main`)
```
94e5555 Fix: quitar next/font/google para build en Coolify
d0d0063 Integración design system Astryx (composición-first)
0f43a65 Landing: animaciones de entrada, textura de papel, footer único
0429f6a Landing page profesional completa: navbar, hero, servicios, cómo funciona, confianza, contacto, CTA, footer
674043e Landing page desde 0: ERP chileno + diseño web corporativo
b70b1e4 Reportes: interfaz con jerarquía realmente notoria — el número manda de verdad
a952355 Reportes: filtros reales, nuevo "Ventas por área" y gráficos corregidos
```

### Verificación
- `tsc --noEmit`: exit 0 (solo ruido preexistente de `src/lib/pdf/`)
- `next build --webpack`: exit 0, 143 páginas estáticas generadas
- Servidor dev: `http://localhost:3000` (HTTP 200, sirve los cambios nuevos)
- Coolify: desplegó commit `94e5555` con éxito; hacer **hard refresh** (`Ctrl+F5` / `Cmd+Shift+R`) en `erp.faenaexpress.cl` para ver los cambios

---

## Proyecto

**"Facturas"** — ERP para empresas chilenas (CLP, IVA 19%). Módulos: Facturas, Colegios, Punto de Venta. Registro de compras, ventas, gastos, y quién pagó cada gasto.

### Stack
- Next.js 16 (App Router, `src/`), React 19, TypeScript strict
- Tailwind CSS 4 (`@tailwindcss/postcss` + `@tailwindcss/turbopack`)
- Prisma 7 + `@prisma/adapter-pg` (`PrismaPg` en `src/lib/db.ts`)
- Client en `src/generated/prisma` (gitignored); tipos desde `@/generated/prisma/client`
- Auth propia (sesiones opacas, bcryptjs), roles: ADMIN, ACCOUNTANT, SALES, VIEWER
- App en `erp.faenaexpress.cl` (perfil `standalone`, redirect a `/login`)
- Nombres de fuentes: **IBM Plex Sans** → cambiado a **fuentes del sistema** (ver nota abajo)

---

## Cambios realizados en esta sesión

### 1. Integración del design system Astryx (meta/astryx)
Se integraron los principios del design system de Meta (React 19+, MIT, Beta) sin instalar el paquete (almacenamiento pnpm de solo lectura):

**Nuevos componentes en `src/components/astryx/`:**
- `button.tsx` — Botón compuesto con variantes (primary/secondary/outline/ghost/danger), tamaños (sm/md/lg), soporte `href`, estados disabled/hover/active
- `card.tsx` — Card compuesta con partes independientes (Header, Title, Description, Content, Footer)
- `typography.tsx` — Text, Heading, Label, Caption con jerarquía tipográfica intencional
- `layout.tsx` — Stack, Grid, Box con espaciado de 4px del sistema
- `index.ts` — Barrel de exportación

**Principios aplicados:**
- Composition first: partes se combinan libremente
- Theming vía CSS custom properties (tokens en `globals.css`)
- No styling lock-in: Tailwind + CSS vars, sin build plugin
- API predecible: mismas convenciones en todos los componentes

### 2. Landing page desde 0
Componentes en `src/components/landing/`:
- `navbar.tsx` — Navbar fija con botones "Entrar" y "Crear cuenta"
- `hero.tsx` — Hero con representación real del ERP (tabla de libro de ventas, sin datos inventados), número hero grande
- `problema.tsx` — 3 problemas reales con íconos SVG funcionales
- `servicios.tsx` — ERP y diseño web como ofertas desiguales (sin cards idénticas)
- `como-funciona.tsx` — 3 pasos reales del producto
- `confianza.tsx` — Contenido real (datos tuyos, hecho en Chile, libros que cuadran), sin logos falsos
- `contacto-section.tsx` — Información real + formulario funcional (usa `enviarContacto` action)
- `cta.tsx` — CTA final: entrar al ERP o contacto para diseño web
- `footer.tsx` — Footer profesional con marca y enlaces organizados por categoría

**Páginas actualizadas:**
- `src/app/page.tsx` — Landing pública (solo cuando `isSaas()`)
- `src/app/contacto/page.tsx` — Usa `LandingNavbar`, `ContactoSection`, `LandingFooter`

### 3. Arreglo del build en Coolify (fix crítico)
**Problema:** `next/font/google` intenta descargar **IBM Plex Sans desde Google Fonts** durante el build en el contenedor de Docker, pero no hay acceso a red externa para fuentes. El build fallaba con `TypeError: Cannot read properties of null (reading '1')`.

**Fix (commit `94e5555`):**
- `src/app/layout.tsx`: Quitado `import { IBM_Plex_Sans } from "next/font/google"`. Ahora usa `className="font-sans"` en `<html>`.
- `src/app/globals.css`: `--font-sans` ahora es `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif` (fuentes del sistema, sin descarga externa)

### 4. Cambios previos (ya en main)
- Libros de compras/ventas con filtros multi (tipo, estado, área, vendedor), búsqueda por texto (folio/nombre/RUT), export a Excel que respeta filtros
- Reporte "Ventas por área" (página + export con 2 hojas)
- Gráficos corregidos: eje Y usa CLP abreviado (no `/1e6`), heatmap normalizado contra el máximo real, barras con ancho real
- Saldo por cobrar/pagar sigue regla de `ledger.ts` (solo documentos pendientes/parciales/vencidos)
- Barra de filtros con "Limpiar" que conserva el período (`keepKeys`)
- Nav de reportes con estado activo pronunciado

---

## Comandos útiles

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | Servidor de desarrollo (Turbopack) en localhost:3000 |
| `pnpm build` | `prisma generate` + build de producción |
| `pnpm lint` | ESLint directo |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm db:migrate` | Crea y aplica migración (puente TLS local) |
| `pnpm db:generate` | Regenera Prisma Client |
| `pnpm prisma db seed` | Crea admin y empresa (usa `ADMIN_*` del `.env`) |
| `pnpm db:drift` | Compara base con schema; exit 0 = alineados |

### Deploy (Coolify)
- Build: `pnpm build` (Dockerfile en raíz)
- Release: `pnpm db:deploy` (entrypoint del contenedor)
- Variables: `DATABASE_URL`, `SII_SECRET_KEY`, `ADMIN_*`, `COMPANY_NAME`
- Puerto 5432 en VPS (sin TLS para CLI de Prisma en producción)
- Puerto 5433 local (con TLS para desarrollo)

---

## Notas importantes

1. **Fuentes:** Se quitó `next/font/google` (IBM Plex Sans) porque fallaba en el build de Coolify (no hay red externa para Google Fonts en el contenedor). Ahora usa fuentes del sistema. Si se quiere volver a IBM Plex Sans, hay que alojar la fuente localmente o usar otra estrategia.

2. **Filtros de reportes:** Los 4 reportes (libro-compras, libro-ventas, ventas-por-area, gastos) comparten la misma capa de filtros en `src/lib/report-filters.ts`. El export de cada reporte lee los mismos parámetros que la pantalla.

3. **Saldo:** Sigue la regla de `src/lib/ledger.ts` (`calcularTotales`). Solo documentos pendientes/parciales/vencidos generan saldo. Un documento `PAID` puede no tener filas en `Payment` (RCV lo marca pagado sin abonos).

4. **CONTEXTO.md es fuente de verdad** (mandato del usuario: "solo hazle caso al contexto.md"). Actualizar este archivo con cambios relevantes.

---

## Próximos pasos sugeridos

1. Verificar que Coolify desplegó `94e5555` y hacer hard refresh en `erp.faenaexpress.cl`
2. Considerar aplicar el sistema astryx también a las páginas internas de `/facturas` (no solo landing)
3. Considerar mejorar "Ventas por cliente" / "Ventas por vendedor" (solo tienen filtro de período, sin gráficos)
4. Auditar el cuadre de libros ↔ IVA después de cambios de saldo
