import { DteImportForm } from "@/app/dashboard/importar/dte-import";
import { ImportForm } from "@/app/dashboard/importar/import-form";
import { PurchaseXmlImport } from "@/app/dashboard/importar/purchase-xml-import";
import { RcvImportForm } from "@/app/dashboard/importar/rcv-import";
import { requireContext } from "@/lib/auth";
import { currentPeriod } from "@/lib/money";
import { hasStoredSiiCredentials } from "@/lib/sii-credentials";
import { readSessionStatus } from "@/lib/sii/rcv";
import { cardClass } from "@/lib/ui";

const templates = [
  { kind: "purchases", label: "Compras" },
  { kind: "sales", label: "Ventas" },
  { kind: "expenses", label: "Gastos" },
];

export default async function ImportPage(props: PageProps<"/dashboard/importar">) {
  const ctx = await requireContext("importar");
  const searchParams = await props.searchParams;
  const rawRcv = Array.isArray(searchParams.rcv) ? searchParams.rcv[0] : searchParams.rcv;
  const defaultSide = rawRcv === "VENTA" ? "VENTA" : rawRcv === "COMPRA" ? "COMPRA" : "COMPRA";
  const session = await readSessionStatus(ctx.company.id);
  const hasStoredCredentials = await hasStoredSiiCredentials(ctx.company.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carga tus datos en {ctx.company.name}: facturas desde el RCV del SII o desde el XML del facturador, o
          compras, ventas y gastos desde una planilla.
        </p>
      </div>

      <section id="rcv" className={cardClass + " p-5"}>
        <h2 className="font-semibold">Sincronizar con el SII (RCV)</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Trae las facturas de compra y de venta registradas oficialmente en el RCV del período: folio,
          tercero, fechas y montos según el SII. Los folios repetidos se omiten y los terceros se crean si no
          existen.
        </p>
        <div className="mt-4">
          <RcvImportForm session={session} currentPeriod={currentPeriod()} companyRut={ctx.company.rut} defaultSide={defaultSide} hasStoredCredentials={hasStoredCredentials} />
        </div>
      </section>

      <section id="xml" className={cardClass + " p-5"}>
        <h2 className="font-semibold">Factura de venta (XML del facturador)</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sube el EnvioDTE de tus facturas emitidas. El XML completo se guarda para que el PDF
          muestre productos, OC, guía y todo el detalle.
        </p>
        <div className="mt-4">
          <DteImportForm />
        </div>
      </section>

      <section id="xml-compras" className={cardClass + " p-5"}>
        <h2 className="font-semibold">Factura de compra (XML del proveedor)</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sube el XML que te envió tu proveedor. El XML se guarda para que el PDF muestre
          productos, referencias y todo el detalle.
        </p>
        <div className="mt-4">
          <PurchaseXmlImport />
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Desde planilla</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compras, ventas o gastos desde Excel o CSV: se buscan por nombre (o RUT en el caso de terceros).
        </p>
        <div className="mt-4">
          <ImportForm />
        </div>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Plantillas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Descarga una plantilla CSV de ejemplo, complétala en Excel y vuelve a subirla.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {templates.map((template) => (
            <li key={template.kind}>
              <a
                href={`/dashboard/importar/plantilla?tipo=${template.kind}`}
                className="inline-block btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-3 py-2 text-sm text-foreground"
              >
                Plantilla de {template.label.toLowerCase()}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Notas</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>Las fechas aceptan el formato AAAA-MM-DD o DD/MM/AAAA.</li>
          <li>Los montos van en pesos, sin decimales (se ignoran puntos y comas de miles).</li>
          <li>El total se recalcula en el servidor como neto + IVA; no hace falta una columna de total.</li>
          <li>Si no indicas el IVA, se calcula con la tasa configurada en la empresa.</li>
          <li>Las notas de crédito y débito deben traer el folio de referencia del documento que ajustan.</li>
          <li>Si una fila tiene un problema, se informa el número de fila y el resto se importa igual.</li>
        </ul>
      </section>
    </div>
  );
}
