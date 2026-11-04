# Yellow ERP

ERP para empresas chilenas: registra **compras, ventas y gastos** —incluido
**quién pagó cada gasto**— y arma los libros de IVA, las comisiones y la
conciliación bancaria.

- **Dinero:** CLP (sin decimales en pantalla).
- **Impuesto:** IVA 19% ( Chile).
- **Módulos:** Facturas, Colegios y Punto de Venta.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, `src/`), React 19, TypeScript y
  Tailwind CSS 4.
- PostgreSQL con [Prisma 7](https://www.prisma.io) (driver adapter `@prisma/adapter-pg`).
- Sesiones propias: cookies opacas con hash del token en la tabla `Session` y
  contraseñas con `bcryptjs`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo. |
| `pnpm build` | `prisma generate` + build de producción. |
| `pnpm lint` | ESLint (`next lint` ya no existe). |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit`. |
| `pnpm db:migrate` | Crea y aplica una migración de desarrollo. |
| `pnpm db:generate` | Regenera Prisma Client. |
| `pnpm db:deploy` | Aplica las migraciones en producción (lo corre el entrypoint de Docker). |
| `pnpm db:drift` | Compara la base con el schema; sale 0 si están alineados. |
| `pnpm db:baseline` | Baséa una base antigua al baseline `0_init` (ver `AGENTS.md`). |
| `pnpm db:studio` | Abre Prisma Studio. |

## Impresión de facturas

La factura comercial (la que se le entrega al cliente o al proveedor) se genera
en el servidor con `@react-pdf/renderer` y una plantilla de
[easy-invoice-pdf](https://github.com/VladSez/easy-invoice-pdf) vendorizada en
`src/lib/pdf/vendor/easy-invoice-pdf`. Los totales salen de `src/lib/ledger.ts`,
la misma regla que usan el panel, las listas y los reportes.

La carta DTE (el documento tributario) es otra cosa y tiene su propia ruta:
`/facturas/ventas/[id]/pdf` y `/facturas/compras/[id]/pdf`.

## Licencia

Este proyecto se publica bajo la **GNU Affero General Public License v3.0**
(o «AGPL-3.0»). El texto completo está en [`LICENSE`](./LICENSE).

La AGPL exige que, si el programa se usa a través de una red, se ofrezca el
código fuente correspondiente. Por eso:

- el código de este ERP está en <https://github.com/fvnks/faenaexpress>, junto con
  el `LICENSE` y el `README.md` que satisfacen el requisito del §13 de la AGPL
  (ofrecer el código fuente cuando el programa se usa en red). La atribución se
  hace en el repositorio, no se imprime en el pie de cada PDF.
- la plantilla vendorizada conserva su licencia original (AGPL-3.0) en
  [`src/lib/pdf/vendor/easy-invoice-pdf/LICENSE`](./src/lib/pdf/vendor/easy-invoice-pdf/LICENSE),
  y los cambios que le hicimos están detallados en
  [`src/lib/pdf/vendor/easy-invoice-pdf/README.md`](./src/lib/pdf/vendor/easy-invoice-pdf/README.md).

### Atribución

- **easy-invoice-pdf** — Copyright (C) 2024-present ULADZISLAU SAZONAU —
  <https://github.com/VladSez/easy-invoice-pdf> (AGPL-3.0).
- **Open Sans** — Copyright 2020 The Open Sans Project Authors — licensed under
  the SIL Open Font License 1.1 (`public/fonts/OpenSans-OFL.txt`).
