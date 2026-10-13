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
    case "duplicada":
      return <span className="inline-flex whitespace-nowrap rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Duplicada</span>;
    case "omitida":
      return <span className="inline-flex whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Omitida</span>;
    default:
      return <span className="inline-flex whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Error</span>;
  }
}

export function PurchaseXmlImport() {
  const [preview, previewAction] = useActionState(previewPurchaseXml, undefined);
  const [confirm, confirmAction] = useActionState(confirmPurchaseXml, undefined);

  const rows = preview?.rows ?? [];
  const nuevas = rows.filter((row) => row.estado === "nueva");
  const payload = JSON.stringify(nuevas);

  useEffect(() => {
    if (confirm?.ok && confirm.imported) {
      toast.success(`Se importaron ${confirm.imported} compra(s)`);
    }
  }, [confirm]);

  return (
    <div className="flex flex-col gap-4">
      <form action={previewAction} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-1 flex-col gap-1">
          <label htmlFor="purchase-xml-file" className="text-sm font-medium">
            XML del proveedor (EnvioDTE)
          </label>
          <input
            id="purchase-xml-file"
            name="file"
            type="file"
            accept=".xml,text/xml,application/xml"
            required
            className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-control file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
          />
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
            {preview?.resumen?.duplicadas ? (
              <span className="rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary">
                {preview.resumen.duplicadas} duplicadas
              </span>
            ) : null}
            {preview?.resumen?.omitidas ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
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

          {nuevas.length > 0 && !confirm?.ok ? (
            <form action={confirmAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="payload" value={payload} />
              <input type="hidden" name="xmlContent" value={preview?.xmlContent ?? ""} />
              <SubmitButton
                pendingLabel="Importando…"
                className="btn-liquid btn-liquid-primary rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
              >
                Importar {nuevas.length} {nuevas.length === 1 ? "compra" : "compras"}
              </SubmitButton>
              <span className="text-xs text-muted-foreground">
                Se crean como pendientes de pago; guarda el XML para el PDF con detalle.
              </span>
            </form>
          ) : null}
        </div>
      ) : null}

      {confirm?.ok && confirm.imported ? (
        <p role="status" className="rounded-control border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">
          Se importaron {confirm.imported} compras a Compras.
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
