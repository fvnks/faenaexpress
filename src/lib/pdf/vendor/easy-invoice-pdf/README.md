# easy-invoice-pdf (vendorizado)

Este directorio es una copia recortada de
[easy-invoice-pdf](https://github.com/VladSez/easy-invoice-pdf), el proyecto de
VladSez, y se usa para imprimir la factura comercial (ventas y compras) del ERP.

- **Versión vendorizada:** `1.0.5` (commit `021d61d`).
- **Licencia:** AGPL-3.0 (copia íntegra en [`LICENSE`](./LICENSE)). Por eso el ERP
  entero es AGPL-3.0: ver el `LICENSE` de la raíz y la sección «Licencia» del
  `README.md` del proyecto.
- **Autoría:** Copyright (C) 2024-present ULADZISLAU SAZONAU.

## Qué se copió y qué no

Del original se copió solo lo necesario para dibujar una factura:

- la plantilla `default` (`templates/default/`) y los componentes comunes que usa
  (`templates/common/`);
- las traducciones (`translations.ts`), recortadas a español e inglés;
- las utilidades de formato (`utils/`): montos, moneda, período de servicio,
  descuentos por ítem, código QR, importes en letras y helpers de factura.

**No** se copió la aplicación web (formularios, editor visual, base de datos,
panel, sincronización con la nube, analítica). Eso no lo usa el ERP: acá la
plantilla se alimenta con los datos que ya tiene el ERP.

## Modificaciones

Cada cambio lleva un comentario `MODIFICACIÓN (vendorizado)` en el archivo
correspondiente. El resumen:

### Modelo de datos (`schema.ts`)

- El `schema` de **zod** del original se reemplaza por **tipos de TypeScript**.
  El ERP valida los datos antes de armar el documento (`src/lib/pdf/documento-pdf.ts`),
  así que la validación en tiempo de ejecución no hacía falta.
- Se recorta el catálogo: monedas `CLP`, `USD`, `EUR`; idiomas `es`, `en`; una
  sola plantilla (`default`).
- Se agregan los campos que el ERP necesita y el original no tenía:
  `erpPaidAmount`, `erpRetentionAmount`, `erpExemptAmount`, `erpSurchargeAmount`,
  `erpDocumentLabel`, `erpBalanceVisible`, `erpLabels`, `erpFooterDueDate`,
  `qrCodeData`, `qrCodeDescription` y `qrCodeIsVisible`.

### Plantilla (`templates/default/`)

- **Tipografías:** el original bajaba Open Sans de `static.easyinvoicepdf.com` en
  cada generación. Acá la fuente se sirve desde `/public/fonts` (`src/lib/pdf/fonts.ts`),
  con su licencia SIL OFL en `public/fonts/OpenSans-OFL.txt`: el PDF no depende de
  un tercero.
- **Emisor y receptor:** el original rotulaba «Vendedor» y «Comprador». Acá son
  «Emisor» y «Receptor», porque en una factura de compra los papeles están
  invertidos (el emisor es el proveedor).
- **Bloque de totales:** el original imprimía siempre «Pagado 0» y daba el total
  por pendiente. Acá el bloque dice la verdad del documento: lo que se paga, lo
  pagado y lo que queda, y en las notas de crédito o débito omite las líneas de
  saldo (una nota no se paga: se aplica contra otro documento).
- **Fecha de pago:** el original decía siempre «Fecha de pago» y escribía la
  fecha de vencimiento. Acá la etiqueta dice qué fecha es.
- **Pie de página:** el original ponía su marca («Creado con easyinvoicepdf.com»).
  Acá va el pie del ERP con el folio, el total y el vencimiento. La atribución
  al código fuente (requisito del §13 de la AGPL para un uso en red) no se imprime
  en el PDF: vive en el `LICENSE` de la raíz, en el `README.md` del proyecto y en
  `AGENTS.md`.
- **Espaciado del pie:** el original armaba el pie con varios `<Text>` sueltos y un
  `gap` que `react-pdf` no siempre respeta (el texto salía pegado). Acá el pie es
  un solo texto con los separadores dentro.
- **Montos sin decimales:** en Chile (CLP) no se usan decimales. `utils/format-amount.ts`
  imprime 0 dígitos fraccionarios para CLP y 2 para USD/EUR (`fractionDigitsFor`).
- **Diseño de compra al estilo SII:** en compras (`erpIsPurchase`) se imprime un
  recuadro rojo con el RUT del proveedor (emisor), el tipo de documento y el folio,
  más la leyenda «UNIDAD S.I.I.», igual que la representación gráfica del SII
  (`templates/common/invoice-sii-box.tsx`).
- **Etiquetas de columnas:** las funciones de traducción que dependían del nombre
  del impuesto se llaman a través de `utils/etiquetas.ts`, que tolera tanto la
  firma con argumento como la que lo ignora.
- **Traducción al español:** «Tipo IVA» pasó a ser «Tasa de IVA», que es lo que
  significa en Chile.

### Utilidades (`utils/`)

- Se quitaron las dependencias del proyecto original que no aplican acá:
  **Sentry**, **sonner** (los avisos de la interfaz) y **umami** (analítica). Los
  errores se registran en la consola del servidor en vez de enviarse a un tercero.
- `utils/number-to-words/` quedó con español e inglés.
- `utils/qr.ts` (`generateQrCodeDataUrl`) genera el PNG del código QR como data
  URL. Se usa para el QR tributario del SII: `src/lib/pdf/qr-sii.ts` arma la URL
  de validación del SII (RUT emisor sin DV, tipo de documento, folio, fecha
  `DDMMAAAA`, monto total y RUT receptor con DV) y `documento-pdf.ts` la convierte
  en imagen con `generateQrCodeDataUrl` e imprime el código en la factura.

## Código QR del SII (PDF417 del timbre electrónico)

El ERP imprime el código de barras 2D del SII (PDF417 del timbre
electrónico) en la factura comercial (ventas y compras). `src/lib/pdf/pdf417-sii.ts`
arma el string del PDF417 (`RE:RUT|TD:TIPO|F:FOLIO|FE:FECHA|RR:RUT_RECEPTOR|MNT:MONTO`,
el mismo formato que usa la plantilla del SII en `src/lib/sii/pdf-template.ts`)
y `documento-pdf.ts` lo renderiza como imagen SVG con la librería
`pdf417-generator` (ya dependencia del proyecto), sin depender de un canvas de
navegador.

## Si se actualiza el original

1. Copiar de nuevo los archivos desde el upstream y volver a aplicar los cambios
   listados arriba (los comentarios `MODIFICACIÓN` son la guía).
2. Actualizar la versión y el commit en este README.
3. Copiar la `LICENSE` del upstream a este directorio.
