"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  confirmPurchaseXml,
  previewPurchaseXml,
} from "@/app/actions/dte";
import { SubmitButton } from "@/components/submit-button";
import { dteTipoLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";

function EstadoBadge({ estado }: { estado: string }) {
  switch (estado) {
    case "nueva":
      return <span className="inline-flex whitespace-nowrap rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Nueva</span>;
    case "actualizar":
      return <span className="inline-flex whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Completar</span>;
    case "duplicada":
      return <span className="inline-flex whitespace-nowrap rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Duplicada</span>;
    case "omitida":
      return <span className="inline-flex whitespace-nowrap rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground">Omitida</span>;
    default:
      return <span className="inline-flex whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Error</span>;
  }
}

export function PurchaseXmlImport() {
  const [preview, previewAction] = useActionState(previewPurchaseXml, undefined);
  const [confirm, confirmAction] = useActionState(confirmPurchaseXml, undefined);

  const rows = preview?.rows ?? [];
  const nuevas = rows.filter((row) => row.estado === "nueva");
  const completar = rows.filter((row) => row.estado === "actualizar");
  const accionables = [...nuevas, ...completar];
  const payload = JSON.stringify(accionables);
  const xmlFiles = JSON.stringify(preview?.xmlFiles ?? []);

  useEffect(() => {
    if (confirm?.ok && (confirm.imported || confirm.updated)) {
      const partes = [
        confirm.imported ? `${confirm.imported} ${confirm.imported === 1 ? "compra nueva" : "compras nuevas"}` : null,
        confirm.updated ? `${confirm.updated} ${confirm.updated === 1 ? "completada" : "completadas"} con su XML` : null,
      ].filter(Boolean);
      toast.success(partes.join(" · "));
    }
  }, [confirm]);

  return (
    <div className="flex flex-col gap-4">
      <form action={previewAction} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-1 flex-col gap-1">
          <label htmlFor="purchase-xml-file" className="text-sm font-medium">
            XML del proveedor (EnvioDTE) o el ZIP del respaldo
          </label>
          <input
            id="purchase-xml-file"
            name="file"
            type="file"
            multiple
            accept=".xml,.zip,text/xml,application/xml,application/zip"
            required
            className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-control file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
          />
          <span className="text-xs text-muted-foreground">
            Puedes elegir varios XML a la vez o un ZIP completo (se descomprime solo). Las facturas que ya están
            por RCV se completan con su detalle.
          </span>
        </div>
        <SubmitButton
          pendingLabel="Analizando…"
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-4 py-2 text-sm font-semibold text-foreground"
        >
          Analizar XML
        </SubmitButton>
      </form>

      {preview?.error ? (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {preview.error}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary">
              {rows.length} en el XML
            </span>
            <span className="rounded-full bg-success-soft px-2.5 py-1 font-medium text-success">
              {nuevas.length} nuevas
            </span>
            {preview?.resumen?.actualizar ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
                {preview.resumen.actualizar} se completan con el XML
              </span>
            ) : null}
            {preview?.resumen?.duplicadas ? (
              <span className="rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary">
                {preview.resumen.duplicadas} duplicadas
              </span>
            ) : null}
            {preview?.resumen?.omitidas ? (
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-medium text-muted-foreground">
                {preview.resumen.omitidas} omitidas
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Folio</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Proveedor</th>
                  <th className="px-3 py-2 text-right font-medium">Neto</th>
                  <th className="px-3 py-2 text-right font-medium">IVA</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.tipoDTE}-${row.folio}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 align-top">{dteTipoLabel(row.tipoDTE)}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top font-medium">{row.folio}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">{formatDate(new Date(row.fecha + "T00:00:00.000Z"))}</td>
                    <td className="max-w-[16rem] px-3 py-2 align-top">
                      <span className="block truncate font-medium">{row.cliente}</span>
                      {row.descripcion ? (
                        <span className="block truncate text-xs text-muted-foreground">{row.descripcion}</span>
                      ) : null}
                      {row.mensaje ? (
                        <span className="block text-xs text-muted-foreground">{row.mensaje}</span>
                      ) : null}
                      {row.existingSaleId ? (
                        <a href={`/facturas/compras/${row.existingSaleId}`} className="block text-xs font-medium text-primary underline">
                          Ver compra existente
                        </a>
                      ) : null}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top">{formatCLP(row.neto)}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top">{formatCLP(row.iva)}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">{formatCLP(row.total)}</td>
                    <td className="px-3 py-2 align-top">
                      <EstadoBadge estado={row.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {accionables.length > 0 && !confirm?.ok ? (
            <form action={confirmAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="payload" value={payload} />
              <input type="hidden" name="xmlFiles" value={xmlFiles} />
              <SubmitButton
                pendingLabel="Importando…"
                className="btn-liquid btn-liquid-primary rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
              >
                Importar {nuevas.length} {nuevas.length === 1 ? "compra" : "compras"}
                {completar.length > 0 ? ` y completar ${completar.length}` : ""}
              </SubmitButton>
              <span className="text-xs text-muted-foreground">
                Las nuevas quedan pendientes de pago; a las que ya estaban se les guarda el XML y su detalle.
              </span>
            </form>
          ) : null}
        </div>
      ) : null}

      {confirm?.ok && (confirm.imported || confirm.updated) ? (
        <p role="status" className="rounded-control border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">
          {confirm.imported ? `Se importaron ${confirm.imported} compras a Compras. ` : ""}
          {confirm.updated ? `Se completaron ${confirm.updated} compras con la información del XML.` : ""}
        </p>
      ) : null}

      {confirm?.errores?.length ? (
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          {confirm.errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      {confirm?.error ? (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {confirm.error}
        </p>
      ) : null}
    </div>
  );
}
