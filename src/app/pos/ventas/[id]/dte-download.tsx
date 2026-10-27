"use client";

import { secondaryButtonClass } from "@/lib/ui";

type DteDownloadProps = {
  dtes: Array<{
    id: string;
    tipoDte: number;
    folio: number;
    estado: string;
    trackId: string | null;
    xmlEnviado: string | null;
  }>;
};

export function DteDownloadButton({ dtes }: DteDownloadProps) {
  const dte = dtes[0];
  const xml = dte?.xmlEnviado ?? null;
  const estado = dte?.estado;

  if (!xml || estado !== "EMITIDO") return null;

  const tipoLabel =
    dte!.tipoDte === 39 ? "Boleta" : dte!.tipoDte === 33 ? "Factura" : `DTE ${dte!.tipoDte}`;
  const folioStr = String(dte!.folio).padStart(6, "0");

  function descargarXml() {
    const xmlString = xml ?? "";
    const blob = new Blob([xmlString], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipoLabel}-${folioStr}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-4 border-t border-border pt-3 text-xs">
      <p className="text-muted-foreground">Descargar DTE</p>
      <button
        type="button"
        onClick={descargarXml}
        className={secondaryButtonClass + " text-xs px-3 py-1"}
      >
        Descargar XML ({tipoLabel} N° {folioStr})
      </button>
    </div>
  );
}
