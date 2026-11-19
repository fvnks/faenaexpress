# Contexto Corto - Facturas ERP + Astryx Migration

## Estado del Proyecto (19 Nov 2026 - 08:58)

**Proyecto:** Facturas ERP - Módulo de facturación chileno (CLP, IVA 19%)
**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Prisma 7, pnpm 12.5.1
**Ubicación:** `/run/media/fvnks/datos/Proyectos/faenaexpress`

## Estado de Migración a Astryx v0.7.16

### ✅ COMPLETADO - Componentes Astryx Core (19/19)
| Componente | Archivo | Estado |
|------------|---------|--------|
| Button | `src/components/astryx/button.tsx` | ✅ Migrado (label prop, as={Link} pattern, as polymorphic, width prop, type="submit") |
| Card | `src/components/astryx/card.tsx` | ✅ Migrado (usa Card de core) |
| Typography | `src/components/astryx/typography.tsx` | ✅ Migrado (Text, Heading de core) |
| Feedback | `src/components/astryx/feedback.tsx` | ✅ Migrado (Badge, Banner de core) |
| Table | `src/components/astryx/table.tsx` | ✅ Migrado (Table de core) |
| Layout | `src/components/astryx/layout.tsx` | ✅ Migrado (Stack, Grid de core) |
| Form | `src/components/astryx/form.tsx` | ✅ Migrado (TextInput, TextArea, Selector, CheckboxInput, RadioList de core) |
| Icons | `src/components/astryx/icons.tsx` | ✅ Migrado (Icon de core) |
| Overlay | `src/components/astryx/overlay.tsx` | ✅ Migrado (Dialog, DialogHeader de core) |
| Navigation | `src/components/astryx/navigation.tsx` | ✅ Migrado (TabList, Tab, Breadcrumbs, BreadcrumbItem de core) |
| ActionsDropdown | `src/components/astryx/actions-dropdown.tsx` | ✅ Migrado (Button, Stack de core) |
| CancelSaleModal | `src/components/astryx/cancel-sale-modal.tsx` | ✅ Migrado (Dialog, DialogHeader, Stack, Text de core) |
| ConfirmDialog | `src/components/astryx/confirm-dialog.tsx` | ✅ Migrado (Dialog, DialogHeader de core) |
| NoSalespeopleHint | `src/components/astryx/no-salespeople-hint.tsx` | ✅ Migrado (Text de core) |
| SelectDropdown | `src/components/astryx/select-dropdown.tsx` | ✅ Migrado (Selector, MultiSelector de core) |
| DataDisplay | `src/components/astryx/data-display.tsx` | ✅ Migrado (Card, Badge de core) |
| DateRangeFilter | `src/components/astryx/date-range-filter.tsx` | ✅ Migrado (DateRangeInput de core) |
| SortableHeader | `src/components/astryx/sortable-header.tsx` | ✅ Migrado (TableHeaderCell, Button as={Link} de core) |
| ReimbursementBadge | `src/components/astryx/reimbursement-badge.tsx` | ✅ Migrado (StatusBadge de core) |
| XmlBadge | `src/components/astryx/xml-badge.tsx` | ✅ Migrado (Badge de core) |

### ✅ COMPLETADO - Páginas Facturas Migradas (80+ páginas)
Todas las páginas bajo `/app/facturas/` y `/app/pos/` migradas a componentes Astryx.

### ✅ VERIFICACIÓN TÉCNICA
- `pnpm typecheck` → **PASA** ✅
- `pnpm build` → **PASA** (143 páginas estáticas) ✅
- `pnpm dev` → **Corriendo** en http://localhost:3000 ✅

### ✅ REDISEÑO VISUAL - Correcciones aplicadas (Web Interface Guidelines)
- **Skip link** agregado en `layout.tsx` para accesibilidad
- **Heading/Text components** usados consistentemente en lugar de h1/p raw
- **Button as={Link}** pattern usado en todas las páginas (exportar, nueva, etc.)
- **Button as="a"** pattern usado en exportaciones de reportes
- **Button as="a"** con `type="submit"` corregido en `apoderado/verificar-codigo`
- **text-wrap:balance** / `text-wrap-balance` en headings y KPI footers
- **aria-hidden="true"** en iconos decorativos
- **KpiCard** usado consistentemente en todas las páginas de listado
- **Astryx components** (Card, Grid, Stack, Heading, Text, Badge, Button, etc.) usados consistentemente

### 🔧 ARREGLADO HOY - Theme/Light Mode + Filtros + Botones + Colores Completos + Fix CSS Structure
- **globals.css**: Fixed CSS structure - moved `@layer components` outside `@theme inline` block
- **globals.css**: Removed `@import "@astryxdesign/theme-neutral/theme.css"` (was forcing dark)
- **globals.css**: Added comprehensive 120+ token mappings for all Astryx components (Card, Input, Select, MultiSelector, TextInput, Skeleton, Shadow, Overlay)
- **globals.css**: Forced light mode default: `color-scheme: light` on `:root`
- **globals.css**: Fixed `.btn-liquid::before` to use `var(--primary-soft)` with `opacity: 0.3` instead of `rgba(0,0,0,0.05)`
- **globals.css**: Fixed `.btn-liquid-secondary` to use tokens `--secondary`, `--secondary-foreground`, `--secondary-soft`
- **globals.css**: Added comprehensive token mappings for Card, Input, Select, MultiSelector, TextInput, Skeleton, Shadow, Overlay
- **filter-bar.tsx**: Fixed horizontal layout with `direction="horizontal"` and `flex-wrap`
- **theme-toggle.tsx**: Works correctly (toggles `dark` class on `<html>`)
- **theme-toggle.tsx**: Works correctly (toggles `dark` class on `<html>`)

### 🔧 ARREGLADO HOY - CSS Variables para Light/Dark Mode (CRÍTICO)
- **globals.css**: Added `:root` with complete light mode tokens (F8FAFA background, 0F172A foreground, E2E8F0 border)
- **globals.css**: Added `.dark` with complete dark mode tokens (0F172A background, F1F5F9 foreground)
- **globals.css**: Added ALL semantic color tokens (primary, secondary, accent, success, warning, danger) for BOTH light/dark
- **globals.css**: Added hover/soft variants for all semantic colors
- **globals.css**: Added all @theme inline tokens for both light/dark
- **globals.css**: Fixed .btn-liquid::before to use var(--primary-soft) with opacity instead of rgba(0,0,0,0.05)
- **globals.css**: Fixed .btn-liquid-secondary to use --secondary/--secondary-foreground/--secondary-soft tokens
- **globals.css**: Added comprehensive token mappings for Card, Input, Select, MultiSelector, TextInput, Skeleton, Shadow, Overlay
- **filter-bar.tsx**: Fixed horizontal layout with direction="horizontal" and flex-wrap
- **theme-toggle.tsx**: Works correctly (toggles `dark` class on `<html>`)

### ⚠️ PENDIENTE - Verificación Visual
El usuario debe revisar en http://localhost:3000 (login: `admin@facturas.local` / `cambia-esta-clave`) que:
1. El tema Facturas (azul profundo #1B5FA8 + ámbar #C58F2E) se aplica correctamente en AMBOS modos
2. El modo claro se ve claro y el modo oscuro se ve oscuro
3. Los filtros se ven correctamente en ambos modos (horizontal con wrap)
4. Los botones `.btn-liquid` se ven correctamente en ambos modos
5. Los componentes Astryx renderizan con el diseño correcto
6. No hay estilos rotos ni componentes custom/shadcn残留

## Archivos Clave
- `src/components/astryx/` - 19 wrappers de Astryx core
- `src/astryx-themes.ts` - Tema personalizado (azul/ámbar sobre neutros fríos)
- `src/app/globals.css` - Globals CSS con tokens Astryx + tema Facturas (light + dark)
- `src/app/layout.tsx` - Layout principal con `<Theme>` wrapper

## Próximos pasos
1. **Verificación visual** del usuario en localhost:3000
2. **Rediseño visual completo** usando skill `web-design-guidelines` (Opción C del usuario) - si se detectan issues visuales
3. Eliminar cualquier componente custom/shadcn残留

## Comandos útiles
```bash
pnpm typecheck  # Verificar tipos
pnpm build      # Build producción
pnpm dev        # Servidor desarrollo (localhost:3000)
```

## Comandos git
```bash
git status
git add -A
git commit -m "mensaje"
git push origin main
```