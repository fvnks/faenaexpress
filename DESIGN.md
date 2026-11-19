# DESIGN.md — Facturas (Rediseño Visual Total)

> **Dirección visual: Fábrica de Registros / Catálogo Industrial**
> Mundo: *Saville catalog sleeve* — identidad de catálogo de fábrica, cada artefacto con su número FAC, trama de pulsar en blanco sobre negro mate, códigos de color industriales que reemplazan palabras. El acento es estructural, no decorativo.

---

## Qué es y para quién

Herramienta interna de una empresa chilena para registrar compras, ventas y gastos, y saber **quién pagó cada gasto**. La usan dueños y contadores, muchas horas al día. Dinero en **CLP** (sin decimales), **IVA 19%**.

---

## Identidad y personalidad

- **Precisión industrial**: se siente un instrumento de medición, no un formulario web.
- **Serio con el dinero**: la belleza está en la exactitud, nunca en el adorno.
- **Denso para el experto, legible para el novato**: la jerarquía la marcan el número y el estado.
- **El número es protagonista**: montos tabulares, alineados a la derecha, estado siempre con código de color + texto.

---

## Design Read

> Herramienta financiera operativa chilena, lenguaje de catálogo industrial: preciso, denso, con una belleza funcional. Diales: ENERGY 3 / RHYTHM 2 / MOTION 1.

---

## Diales

- **ENERGY 3**: presencia marcada, paleta reducida a lo esencial, contraste alto, un color de marca con carácter industrial. No experimental, pero tampoco anónimo.
- **RHYTHM 2**: estructura consistente (rail lateral, área de trabajo, barra de totales), pero cada vista varía su densidad según su trabajo (panel, listado, detalle, formulario).
- **MOTION 1**: solo estados de interacción (hover, focus, transición de tema, pulso de selección 120ms). Sin bucles ni animaciones decorativas. Respeta `prefers-reduced-motion`.

---

## Paleta — Sistema de Catálogo Industrial

**Concepto**: Negro mate (ground) + Blanco hueso (ink) + **Cobre/terracota** (acento estructural) + **Verde mineral** (estado positivo) + **Rojo óxido** (estado negativo) + **Amarillo mostaza** (atención). Neutros fríos para el resto.

| Token | Claro (Light) | Oscuro (Dark) | Uso |
| --- | --- | --- | --- |
| `--background` | `#0D0D0D` | `#080808` | Fondo de la app (negro mate) |
| `--surface` | `#141414` | `#0F0F0F` | Tarjetas, tablas, inputs (elevación 1) |
| `--surface-elevated` | `#1A1A1A` | `#141414` | Overlays, dropdowns, modales (elevación 2) |
| `--foreground` | `#E8E8E8` | `#F0F0F0` | Texto principal (blanco hueso) |
| `--foreground-muted` | `#8A8A8A` | `#9A9A9A` | Texto secundario, metadatos |
| `--foreground-subtle` | `#5A5A5A` | `#6A6A6A` | Texto terciario, placeholders, ayuda |
| `--border` | `#2A2A2A` | `#1F1F1F` | Bordes, separadores, reglas finas |
| `--border-strong` | `#3A3A3A` | `#2A2A2A` | Bordes de foco, cards seleccionadas |
| `--primary` | `#C45A2A` | `#D47A4A` | **Acento estructural** (cobre/terracota): acción primaria, foco, marca, rail activo |
| `--primary-foreground` | `#FFFFFF` | `#0D0D0D` | Texto sobre primary |
| `--primary-soft` | `#2A1A14` | `#2A1A14` | Fondo suave de marca (hover fila, rail) |
| `--primary-ring` | `#C45A2A` | `#D47A4A` | Anillo de foco |
| `--accent` | `#E8A838` | `#F0C058` | **Solo atención**: pendiente, por cobrar, vencido (amarillo mostaza) |
| `--accent-soft` | `#2A2410` | `#2A2410` | Fondo etiqueta atención |
| `--success` | `#2E7D4A` | `#4AA86A` | Pagado, cobrado, conciliado (verde mineral) |
| `--success-soft` | `#0F1A10` | `#0F1A10` | Fondo etiqueta pagado |
| `--danger` | `#A83C2E` | `#C85C4E` | Error, vencido, anulado (rojo óxido) |
| `--danger-soft` | `#1A0F0E` | `#1A0F0E` | Fondo etiqueta error |

**Reglas de color inquebrantables**:
1. **Negro mate es el ground**. Todo respira sobre `#0D0D0D` / `#080808`. No hay fondos blancos en modo oscuro, ni grises claros en modo claro.
2. **El cobre (`--primary`) es el único color de marca**. Se usa en: rail activo, botón primario, anillo de foco, encabezado de tabla activo, línea de tabla seleccionada. Nunca en decoración.
3. **Estados = código de color + texto**. Nunca solo color. El estado vive en una `Badge` con su punto de color y su label.
4. **Amarillo mostaza (`--accent`) solo para "atención requerida"**. Pendiente, por cobrar, vencido. No para botones.
5. **Verde mineral / Rojo óxido** para estados binarios (pagado/no, conciliado/no). Son colores de sistema, no de marca.
6. **Bordes son reglas finas** (`1px` / `hairline`). No sombras en cards. La elevación se marca con `--surface-elevated` y borde fuerte.

---

## Tipografía — Sistema de Catálogo

**Fuente principal**: **Space Grotesk** (variable: wght 300-700) — geométrica, técnica, legible en tablas, con cifras tabulares nativas.  
**Fuente mono**: **JetBrains Mono** (variable) — para montos, folios, códigos, fechas.  
**Fuente display**: **Space Grotesk** (wght 600-700) — solo para números grandes de KPI y títulos de página.

```css
@font-face { font-family: 'Space Grotesk'; src: url(...); font-weight: 300 700; font-display: swap; }
@font-face { font-family: 'JetBrains Mono'; src: url(...); font-weight: 400 700; font-display: swap; }
```

**Escala tipográfica (clamp fluido)**:

| Rol | Tamaño | Peso | Leading | Tracking | Uso |
| --- | --- | --- | --- | --- | --- |
| Display / KPI | `clamp(2.5rem, 5vw, 4rem)` | 700 | 1.0 | -0.02em | Número principal en panel |
| H1 Página | `clamp(1.75rem, 3.5vw, 2.25rem)` | 700 | 1.1 | -0.01em | Título de página |
| H2 Sección | `clamp(1.25rem, 2.5vw, 1.5rem)` | 600 | 1.2 | 0 | Título de sección/card |
| H3 Subsección | `1rem` | 600 | 1.3 | 0 | Encabezado de tabla, label de grupo |
| Body / Body fuerte | `0.875rem` / `0.875rem` | 400 / 500 | 1.5 | 0 | Texto principal, labels de input |
| Small / Meta | `0.75rem` | 400 | 1.4 | +0.02em | Metadatos, ayuda, timestamps |
| Mono / Tabular | `0.875rem` | 400/500 | 1.5 | 0 | **Montos, folios, fechas, códigos** — `font-variant-numeric: tabular-nums` |

**Reglas**:
- Números **siempre** tabulares (`font-variant-numeric: tabular-nums`).
- Space Grotesk para UI, JetBrains Mono para datos.
- Sin mayúsculas forzadas en UI (solo `H3` tabla en `small-caps` nativo si existe).

---

## Espaciado, Radios, Elevación — Sistema Métrico

- **Unidad base**: `4px` (0.25rem). Escala: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Radios**: 
  - `4px` (0.25rem) — inputs, botones, badges, chips
  - `8px` (0.5rem) — cards, tablas, modales, dropdowns
  - `9999px` — **solo** badges de estado (píldora)
- **Elevación** (solo sombras para overlays):
  - Nivel 0 (ground): `--background` — sin sombra
  - Nivel 1 (surface): `--surface` + `border: 1px solid var(--border)` — cards, tablas
  - Nivel 2 (elevated): `--surface-elevated` + `border: 1px solid var(--border-strong)` + `box-shadow: 0 8px 32px -8px rgb(0 0 0 / 0.4)` — modales, dropdowns, popovers
  - Nivel 3 (modal): Nivel 2 + overlay `rgba(0,0,0,0.6)`

---

## Iconografía — Sistema de Símbolos Técnicos

- **Estilo**: Trazo fino (1.5px), esquinas vivas, 20×20px área óptica, 24×24px bounding box.
- **Fuente**: Subconjunto de **Lucide** (stroke-width 1.5) + símbolos custom para estados chilenos (SII, DTE, IVA).
- **Regla**: Solo iconos funcionales. Sin iconos decorativos. El icono nunca está solo sin label accesible.

---

## Movimiento — Solo Transiciones Funcionales

| Transición | Duración | Easing | Uso |
| --- | --- | --- | --- |
| `fast` | 120ms | `cubic-bezier(0.2, 0, 0, 1)` | Hover, focus, press, badge pulse |
| `base` | 180ms | `cubic-bezier(0.2, 0, 0, 1)` | Transición tema, expandir/collapse, drawer |
| `slow` | 280ms | `cubic-bezier(0.2, 0, 0, 1)` | Cambio de vista principal, modal enter |

- **Signature move**: **Pulse de selección** — al click en fila de tabla o card, la línea izquierda (3px) o el borde superior pulsa al color `--primary` (120ms, double weight). Es la única animación "de marca".
- **Prefers-reduced-motion**: todas las duraciones → 0.01ms, sin animaciones.

---

## Tema Claro y Oscuro — Ambos Ciudadanos de Primera

- **Modo claro**: Ground `#0D0D0D` (sí, oscuro por defecto), superficie `#141414`, texto `#E8E8E8`. El modo "claro" es **alto contraste inverso**.
- **Modo oscuro**: Ground `#080808`, superficie `#0F0F0F`, texto `#F0F0F0`.
- **Interruptor visible** en rail/header. Preferencia en `localStorage` + `media query` fallback.
- **Verificación obligatoria**: contraste 4.5:1 texto, 3:1 bordes/controles en **ambos** modos.

---

## Componentes — Catálogo de Fábrica

### Botones (Button)

| Variante | Ground | Ink | Border | Hover | Focus Ring | Uso |
| --- | --- | --- | --- | --- | --- | --- |
| **Primary** | `--primary` | `--primary-foreground` | none | `--primary` +10% lightness | `--primary-ring` 2px | Acción principal única por vista |
| **Secondary** | `--surface` | `--foreground` | `--border` 1px | `--border-strong` | `--primary-ring` 2px | Acciones secundarias |
| **Ghost** | `transparent` | `--foreground` | none | `--surface` | `--primary-ring` 2px | Acciones terciarias, navegación |
| **Destructive** | `--danger` | `#FFFFFF` | none | `--danger` +10% | `--danger` 2px | Eliminar, anular, acciones irreversibles |

**Estados**: `disabled` → opacity 0.4, cursor not-allowed. `loading` → spinner blanco hueso 16px, texto "Procesando…".

**Tamaños**: `sm` (32px h, px-3), `md` (40px h, px-4), `lg` (48px h, px-6). `icon` (40×40px).

### Inputs (TextInput, TextArea, Select)

```css
.input {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--foreground);
  border-radius: 4px;
  padding: 10px 12px;
  font: inherit;
  font-variant-numeric: tabular-nums; /* para montos */
  transition: border-color 120ms, box-shadow 120ms;
}
.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-soft);
  outline: none;
}
.input::placeholder { color: var(--foreground-subtle); }
.input:disabled { opacity: 0.5; cursor: not-allowed; background: var(--background); }
.input-error { border-color: var(--danger); }
.input-error:focus { box-shadow: 0 0 0 2px var(--danger-soft); }
```

**Label**: `0.75rem`, `500`, `--foreground-muted`, `mb-2`, `text-transform: uppercase`, `letter-spacing: 0.05em`.

**Help/Error**: `0.75rem`, `--foreground-muted` / `--danger`, `mt-1.5`.

### Select / MultiSelector

- Mismo estilo que input, `appearance: none`, flecha custom (trazo 1.5px).
- MultiSelector: chips con `x` dentro del input, fondo `var(--primary-soft)`, texto `var(--primary)`.

### Tabla (Table)

```css
.table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.875rem; }
.table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 0.6875rem; /* 11px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--foreground-muted);
  border-bottom: 1px solid var(--border);
  background: var(--background);
  white-space: nowrap;
}
.table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.table tbody tr {
  transition: background-color 120ms;
}
.table tbody tr:hover {
  background-color: var(--primary-soft);
}
.table tbody tr.selected {
  background-color: var(--primary-soft);
  border-left: 3px solid var(--primary); /* Signature move */
}
.table tbody tr:last-child td { border-bottom: none; }
```

**Montos**: `font-family: 'JetBrains Mono'`, `font-variant-numeric: tabular-nums`, `text-align: right`.

**Estados en fila**: Badge píldora (ver abajo) en columna Estado.

### Badge / Status Pill

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

| Variante | Fondo | Texto | Punto (`::before`) | Uso |
| --- | `--success-soft` | `--success` | `--success` | Pagado, Cobrado, Conciliado |
| `--accent-soft` | `--accent` | `--accent` | Pendiente, Por cobrar, Vencido |
| `--danger-soft` | `--danger` | `--danger` | Error, Anulado, Rechazado |
| `--primary-soft` | `--primary` | `--primary` | Borrador, En proceso |
| `--surface` | `--foreground-muted` | `--border` | Neutro, Sin estado |

### Card / Panel

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  /* Sin sombra en ground level */
}
.card:hover {
  border-color: var(--border-strong);
}
.card-elevated {
  background: var(--surface-elevated);
  border: 1px solid var(--border-strong);
  box-shadow: 0 8px 32px -8px rgb(0 0 0 / 0.4);
}
```

### Rail / Sidebar (Navegación Principal)

- **Ground**: `--background` (negro mate)
- **Item inactivo**: `--foreground-muted`, padding `10px 12px`, `border-radius: 6px`, sin fondo
- **Item hover**: background `var(--surface)`, ink `--foreground`
- **Item activo**: background `var(--primary-soft)`, ink `--primary`, **borde izquierdo 3px `--primary`** (signature move)
- **Icono**: 18×18px, stroke 1.5px
- **Collapsed**: solo iconos, tooltip en hover

### Header / Barra Superior

- **Ground**: `--surface` + `border-bottom: 1px solid var(--border)`
- **Altura**: 56px (desktop), 64px (mobile)
- **Acciones**: Ghost buttons, tema toggle, user menu
- **Breadcrumb**: `--foreground-subtle` / `--foreground`, separador `/`

### KPI Card (Panel Principal)

```css
.kpi-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  transition: border-color 120ms;
}
.kpi-card:hover { border-color: var(--border-strong); }
.kpi-value {
  font-family: 'Space Grotesk';
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--foreground);
  line-height: 1.0;
}
.kpi-label { font-size: 0.75rem; font-weight: 500; color: var(--foreground-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.kpi-trend { font-size: 0.75rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; }
.kpi-trend.up { color: var(--success); }
.kpi-trend.down { color: var(--danger); }
```

---

## Composición por Pantalla (RHYTHM 2)

### Shell (Layout Base)

```
┌─────────────────────────────────────────────────────────────┐
│ Header (56px) — logo, búsqueda global, tema, usuario        │
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│   Rail       │            Work Area                          │
│   (260px /   │  ┌────────────────────────────────────────┐  │
│    64px col) │  │  Page Header (H1 + acción primaria)    │  │
│              │  ├────────────────────────────────────────┤  │
│  - Logo      │  │  Toolbar: filtros | búsqueda | export  │  │
│  - Nav prim. │  ├────────────────────────────────────────┤  │
│  - Nav sec.  │  │                                       │  │
│  - Usuario   │  │           Data Surface                 │  │
│              │  │  (Tabla / Cards / Form / Detalle)      │  │
│              │  │                                       │  │
│              │  └────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────┘
```

### Panel / Resumen (Dashboard)

- **Un foco**: 3–4 KPI cards arriba (por cobrar, por pagar, gasto mes, caja).
- **Debajo**: 2 columnas — tabla "Últimos movimientos" + "Accesos rápidos" (cards ghost).
- **Densidad**: compacta (12px gap entre cards, 8px padding interno).

### Listado (Ventas, Compras, Gastos, Banco)

- **Toolbar**: filtros multi-select + búsqueda + exportar (derecha).
- **Tabla**: densa, row height 48px, sortable headers, selección múltiple con checkbox.
- **Barra de totales** (sticky bottom): totales tabulares, badges de estado resumidos.

### Detalle (Documento)

- **Header**: tipo + folio + estado (badge) + acciones (PDF, editar, anular).
- **Dos columnas**: datos principales (izq) + totales/impuestos (der, sticky).
- **Tabs**: Detalle | Pagos | Historial | XML.

### Formulario (Nuevo/Editar)

- **Ancho máximo**: 640px, centrado.
- **Grupos**: fieldset visual (línea fina `--border`, gap 20px).
- **Acciones**: secundario (cancelar) + primario (guardar), alineados derecha.

---

## Firma Visual — Signature Move

**Pulse de Selección (Rail + Tabla + Card)**

```css
/* Rail item activo */
.nav-item.active {
  background: var(--primary-soft);
  color: var(--primary);
  border-left: 3px solid var(--primary);
}

/* Tabla fila seleccionada */
.table tbody tr.selected {
  background: var(--primary-soft);
  border-left: 3px solid var(--primary);
  /* Pulse animado al click */
  animation: selection-pulse 120ms cubic-bezier(0.2, 0, 0, 1);
}

@keyframes selection-pulse {
  0% { border-left-width: 3px; opacity: 1; }
  50% { border-left-width: 5px; opacity: 0.8; }
  100% { border-left-width: 3px; opacity: 1; }
}

/* Card seleccionada (listado tipo card) */
.card.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-soft);
}
```

Es la **única** animación de marca. Todo lo demás: transiciones funcionales 120–180ms.

---

## Accesibilidad — Inquebrantable

- **Contraste**: 4.5:1 texto, 3:1 bordes/controles en ambos temas (verificación obligatoria).
- **Focus visible**: anillo 2px `--primary-ring` + offset 2px en **todos** los controles.
- **Skip link**: primer tab → "Saltar al contenido principal".
- **ARIA**: labels en todos los controles, `aria-live` en totales y notificaciones, `aria-sort` en headers de tabla.
- **Reducido**: `prefers-reduced-motion` respeta en todo (duraciones → 0.01ms).
- **Teclado**: Tab order lógico, Escape cierra modales/drawers, flechas en tablas/menús.

---

## Responsive — Adaptación Métrica

| Breakpoint | Rail | Tabla | KPI Grid | Formulario |
| --- | --- | --- | --- | --- |
| `≥ 1280px` | 260px expandido | 100% | 4 cols | 640px centrado |
| `1024–1279px` | 260px expandido | 100% | 3 cols | 100% |
| `768–1023px` | 64px colapsado (iconos) | Scroll horizontal | 2 cols | 100% |
| `< 768px` | Drawer (overlay) | Cards apiladas | 1 col | 100% |

- **Tabla en móvil**: se transforma a cards apiladas (cada fila = card), manteniendo montos tabulares y badges de estado.
- **Filtros**: en drawer lateral móvil (mismo componente que rail).

---

## Implementación Técnica

### CSS Custom Properties (globals.css)

```css
@import "tailwindcss";
@plugin "tailwindcss-animate";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* Paleta completa aquí — ver tabla arriba */
  --background: #0D0D0D;
  --surface: #141414;
  --surface-elevated: #1A1A1A;
  --foreground: #E8E8E8;
  --foreground-muted: #8A8A8A;
  --foreground-subtle: #5A5A5A;
  --border: #2A2A2A;
  --border-strong: #3A3A3A;
  --primary: #C45A2A;
  --primary-foreground: #FFFFFF;
  --primary-soft: #2A1A14;
  --primary-ring: #C45A2A;
  --accent: #E8A838;
  --accent-soft: #2A2410;
  --success: #2E7D4A;
  --success-soft: #0F1A10;
  --danger: #A83C2E;
  --danger-soft: #1A0F0E;
  --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  --radius-sm: 0.25rem;  /* 4px */
  --radius-md: 0.5rem;   /* 8px */
  --radius-full: 9999px;
  --shadow-elevated: 0 8px 32px -8px rgb(0 0 0 / 0.4);
}

.dark {
  --background: #080808;
  --surface: #0F0F0F;
  --surface-elevated: #141414;
  --foreground: #F0F0F0;
  --foreground-muted: #9A9A9A;
  --foreground-subtle: #6A6A6A;
  --border: #1F1F1F;
  --border-strong: #2A2A2A;
  --primary: #D47A4A;
  --primary-foreground: #0D0D0D;
  --primary-soft: #2A1A14;
  --primary-ring: #D47A4A;
  --accent: #F0C058;
  --accent-soft: #2A2410;
  --success: #4AA86A;
  --success-soft: #0F1A10;
  --danger: #C85C4E;
  --danger-soft: #1A0F0E;
}

@theme inline {
  /* Mapear todos los tokens a Tailwind v4 */
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-surface-elevated: var(--surface-elevated);
  --color-foreground: var(--foreground);
  --color-foreground-muted: var(--foreground-muted);
  --color-foreground-subtle: var(--foreground-subtle);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-soft: var(--primary-soft);
  --color-primary-ring: var(--primary-ring);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-full: var(--radius-full);
  --shadow-elevated: var(--shadow-elevated);
}
```

### Font Loading (layout.tsx)

```tsx
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

<body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
```

### Componentes Base (ui/)

Crear/actualizar en `src/components/ui/`:
- `button.tsx` — 4 variantes, 3 tamaños, loading, asChild
- `input.tsx` / `textarea.tsx` / `select.tsx` — con label, error, hint
- `badge.tsx` — 6 variantes con punto de color
- `table.tsx` — con selection, sorting, empty state
- `card.tsx` — surface / elevated
- `kpi-card.tsx` — para panel
- `rail.tsx` / `header.tsx` — shell components

---

## Checklist de Verificación (Antes de Commit)

- [ ] `pnpm typecheck` pasa
- [ ] `pnpm build` pasa (143+ páginas)
- [ ] Modo claro: contraste ≥ 4.5:1 en todos los textos
- [ ] Modo oscuro: contraste ≥ 4.5:1 en todos los textos
- [ ] Focus visible en todos los controles (Tab navigation)
- [ ] Skip link funcional
- [ ] `prefers-reduced-motion` desactiva pulse y transiciones
- [ ] Montos usan `tabular-nums` y `font-mono`
- [ ] Badges de estado siempre con texto + punto de color
- [ ] Rail activo / fila seleccionada muestran pulse `--primary`
- [ ] Responsive: rail colapsa, tabla → cards, KPI → 1 col
- [ ] Tema toggle persiste y respeta `color-scheme`

---

**Fin de DESIGN.md** — Este documento es la autoridad visual. Cualquier desviación requiere decisión explícita.