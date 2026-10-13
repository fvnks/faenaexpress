# DESIGN.md

Dirección visual de **Facturas**. Este archivo manda sobre la UI: primero se lee esto, después antislop filtra.

## Qué es y para quién

Herramienta interna de una empresa chilena para registrar compras, ventas y gastos, y para saber **quién pagó cada gasto**. La usan dueños y personal de contabilidad, muchas veces durante horas. Dinero en **CLP** (sin decimales en pantalla), impuesto **IVA 19%**.

## Identidad y personalidad

- **Moderno con personalidad**: se siente un producto actual, no un formulario de sistema antiguo.
- **Serio con el dinero**: los adornos nunca compiten con las cifras.
- **Claro para quien no es experto, denso para quien lo usa a diario**.
- Los números son los protagonistas: montos, saldos y fechas se leen de un vistazo.

## Design Read

> Reading this as: herramienta financiera interna para dueños y contadores, en un lenguaje moderno y sobrio con un acento cálido, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Diales

- **ENERGY 2**: con presencia (jerarquía marcada, un color de marca con carácter, buen contraste), sin llegar a experimental.
- **RHYTHM 2**: la estructura de la app es consistente, pero cada vista varía según su trabajo (panel, listado, detalle, formulario) en vez de repetir una plantilla.
- **MOTION 1**: solo estados de interacción (hover, focus, transición de tema). Sin bucles ni animaciones decorativas.

## Paleta

**Aviso honesto (R-37):** el dueño pidió explícitamente colores azulados en vez de verdes; el agente propuso los valores concretos siguiendo ese criterio. Se puede corregir cuando el dueño quiera.

Concepto: **azul profundo** (confianza, calma, dinero) + **ámbar cálido** (atención: pendientes y vencimientos) sobre **neutros fríos** (más serenos que el beige por defecto). Máximo 2 colores base + 1 acento.

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--background` | `#F4F6F8` | `#0E1418` | Fondo de la app |
| `--surface` | `#FFFFFF` | `#141C22` | Tarjetas, tablas, inputs |
| `--foreground` | `#181B1E` | `#E8EDF1` | Texto principal |
| `--muted-foreground` | `#5A6165` | `#9BA1A5` | Texto secundario |
| `--border` | `#D8DEE3` | `#232D35` | Bordes y separadores |
| `--primary` | `#1B5FA8` | `#4A9FD8` | Acción primaria, foco, marca |
| `--primary-foreground` | `#FFFFFF` | `#081820` | Texto sobre primary |
| `--primary-soft` | `#DDE9F5` | `#1A2E3D` | Fondo suave de marca (iconos de módulo, hover de fila) |
| `--accent` | `#8A5408` | `#E0A94A` | **Solo** atención: pendiente, por cobrar, vencido |
| `--accent-soft` | `#F6E7C8` | `#3A2E14` | Fondo de la etiqueta de atención |
| `--success` | `#1E6B8A` | `#5AB8D8` | Pagado, cobrado |
| `--success-soft` | `#DCF2F5` | `#0E2E3D` | Fondo de la etiqueta de pagado |
| `--danger` | `#B42318` | `#F2857C` | Error, vencido |

Reglas de color:

- El **acento (ámbar) se usa solo para estado de atención**. Nunca para botones primarios. Es un acento poco frecuente, no el color del sistema.
- El **teal marca la acción primaria, el foco y la marca**. 
- **Verde** = pagado o cobrado; **rojo** = error o vencido. El estado nunca depende solo del color: siempre lleva texto.

## Tipografía

**IBM Plex Sans**, con **números tabulares** (`font-variant-numeric: tabular-nums`) en tablas y totales.

Razón: está diseñada para interfaces con muchos datos, tiene cifras muy legibles y se comporta bien en columnas de montos; se siente moderna sin ser la fuente por defecto del modelo (Inter / Geist / system-ui).

Escala: título de página 24 / 700; título de sección 16 / 600; cuerpo 14 / 400; ayuda y metadatos 13 / 400.

## Espaciado, radios y elevación

- Espaciado en múltiplos de 4: 4, 8, 12, 16, 24, 32, 48.
- Radios: `6px` en inputs y botones, `10px` en tarjetas. El radio tipo píldora se reserva **solo** para etiquetas de estado.
- Superficies planas. La sombra es una marca de elevación para overlays (menús, diálogos), no un adorno para cada tarjeta.

## Iconografía

- Sin iconos decorativos. 
- Donde haga falta un icono funcional (cambiar de tema, cerrar un diálogo), se elige por relevancia, no por el look de una librería concreta.

## Movimiento

- Solo en interacción: hover, focus y transición de tema, entre 120 y 180 ms.
- Sin bucles ni animaciones que corran solas. Se respeta `prefers-reduced-motion`.

## Tema claro y oscuro

- **Ambos son ciudadanos de primera clase**: contraste, colores y componentes se verifican en los dos (R-34).
- Interruptor de tema visible en el armazón de la app; la preferencia se recuerda.

## Composición por pantalla (RHYTHM 2)

- **Un foco por pantalla**: exactamente un elemento manda en cada vista.
- **Resumen**: el foco es el estado del negocio (por pagar, por cobrar, gastos), no una fila de tarjetas idénticas.
- **Listado**: el foco es la tabla; los totales van en una barra propia, no mezclados con los filtros.
- **Detalle**: el foco es el documento y su estado; los datos acompañan.
- Ninguna sección existe solo porque "un panel suele tenerla".

## Identidad (motivo propio)

El motivo es el **número como protagonista**: montos siempre tabulares y alineados a la derecha, y el **estado siempre con texto + color**. Se repite en listados, detalles y resúmenes. Es lo que hace que la interfaz se sienta de este producto y no de cualquiera.
