import Link from "next/link";

import { requireContext } from "@/lib/auth";

export const metadata = {
  title: "Ayuda · Plantilla de factura",
};

/** Una fila de la guía: el campo, dónde se imprime y de qué dato sale. */
type Guia = {
  campo: string;
  lugar: string;
  dato: string;
};

const GUIA: Guia[] = [
  {
    campo: "Nombre de la empresa",
    lugar: "Encabezado, arriba a la izquierda.",
    dato: "Razón social de la empresa emisora (la del ERP). En compras es el proveedor quien firma ese encabezado.",
  },
  {
    campo: "Dirección y giro",
    lugar: "Encabezado, bajo el nombre.",
    dato: "Dirección, comuna, ciudad y giro de la empresa. En compras, los del proveedor.",
  },
  {
    campo: "Teléfono",
    lugar: "Encabezado, bajo la dirección.",
    dato: "Teléfono de contacto de la empresa (o del proveedor, en compras).",
  },
  {
    campo: "Correo y sitio web",
    lugar: "Encabezado, bajo el teléfono.",
    dato: "Correo electrónico y sitio web de la empresa (o del proveedor, en compras).",
  },
  {
    campo: "RUT del emisor",
    lugar: "Cuadro rojo SII (R.U.T.) y esquina derecha del encabezado.",
    dato: "RUT de quien emite el documento: la empresa en ventas, el proveedor en compras.",
  },
  {
    campo: "Tipo de documento",
    lugar: "Cuadro rojo SII y referencia del encabezado.",
    dato: "Nombre del DTE (Factura, Boleta, Nota de crédito…) según el tipo registrado.",
  },
  {
    campo: "Folio",
    lugar: "Cuadro rojo SII (Folio N°) y primera línea del pie de página.",
    dato: "Número del documento. Si no tiene folio, se imprime «sin folio».",
  },
  {
    campo: "Fecha de emisión",
    lugar: "Encabezado, columna derecha.",
    dato: "Fecha del documento (la fecha de la venta o de la compra).",
  },
  {
    campo: "Fecha de vencimiento",
    lugar: "Bajo el receptor, a la izquierda.",
    dato: "Fecha de vencimiento; si el documento ya tiene fecha de pago, se imprime como «Fecha de pago».",
  },
  {
    campo: "Receptor",
    lugar: "Bloque central, a la izquierda del cuadro SII.",
    dato: "Nombre de quien recibe: el cliente en ventas, la empresa en compras.",
  },
  {
    campo: "RUT del receptor",
    lugar: "Bajo el nombre del receptor.",
    dato: "RUT del cliente (ventas) o de la empresa (compras).",
  },
  {
    campo: "Dirección del receptor",
    lugar: "Bajo el nombre del receptor.",
    dato: "Dirección, comuna y ciudad del cliente o proveedor.",
  },
  {
    campo: "Forma de pago",
    lugar: "Bloque del receptor.",
    dato: "Medio de pago del documento (Efectivo, Transferencia, etc.).",
  },
  {
    campo: "Ítems (detalle)",
    lugar: "Tabla central de productos/servicios.",
    dato: "Descripción, cantidad, precio neto, IVA e importe neto de cada línea.",
  },
  {
    campo: "Totales y timbre",
    lugar: "Bajo la tabla de ítems.",
    dato: "Cuadro de IVA, total a pagar, PDF417 del SII y el bloque de firma. Apagarlo deja el documento sin montos.",
  },
  {
    campo: "Exento",
    lugar: "Bloque de totales.",
    dato: "Monto exento de IVA. Solo aparece si el documento tiene exento.",
  },
  {
    campo: "Recargo IVA",
    lugar: "Bloque de totales.",
    dato: "Recargo de IVA del documento. Solo aparece si tiene recargo.",
  },
  {
    campo: "Retención",
    lugar: "Bloque de totales.",
    dato: "Retención de honorarios, que se descuenta del total. Solo aparece si hay retención.",
  },
  {
    campo: "Importe en letras",
    lugar: "Última línea del bloque de totales.",
    dato: "El monto a pagar escrito en palabras, con la moneda.",
  },
  {
    campo: "Pagado",
    lugar: "Pie de página.",
    dato: "Lo abonado del documento. Solo se imprime si hay algún abono.",
  },
  {
    campo: "Pendiente de pago",
    lugar: "Pie de página.",
    dato: "Saldo por pagar: total menos retención menos lo abonado.",
  },
  {
    campo: "Documentos de referencia",
    lugar: "Tabla bajo el receptor, con el encabezado de referencias.",
    dato: "Orden de compra (OC, tipo 801) y guía de despacho (guía, tipo 52) que la venta/compra referencia. Aparece solo si la venta tiene alguna.",
  },
  {
    campo: "Vendedor",
    lugar: "Bloque del receptor (ventas), bajo el guía o el HES.",
    dato: "Nombre del vendedor (del catálogo de comisiones) que realizó la venta. En compras no aplica.",
  },
  {
    campo: "N° de Orden de Servicio (HES)",
    lugar: "Bloque del receptor, junto al vendedor o guía.",
    dato: "Número de la orden de servicio asociada al documento (servicios).",
  },
];

export default async function AyudaPlantillaPage() {
  await requireContext("plantillas");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/facturas/plantillas"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Plantillas de factura
          </Link>
          <span aria-hidden>/</span>
          <span>Ayuda</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Qué dato va en cada lugar
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          La factura comercial se arma con los datos de la empresa y del
          documento. Esta guía dice, para cada casilla de la plantilla, qué se
          imprime y dónde. La misma lógica sirve para ventas y compras: en una
          compra, quien emite es el proveedor y quien recibe es la empresa.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Casilla
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Dónde aparece
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Qué dato imprime
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {GUIA.map((fila) => (
              <tr key={fila.campo} className="align-top">
                <th scope="row" className="px-4 py-3 font-medium">
                  {fila.campo}
                </th>
                <td className="px-4 py-3 text-muted-foreground">
                  {fila.lugar}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {fila.dato}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">
        Desmarcar una casilla deja ese dato fuera del PDF. Si no hay ninguna
        plantilla configurada, la factura se imprime con todos los datos.
      </p>
    </div>
  );
}
