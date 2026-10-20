/**
 * Insignia de documento con XML cargado.
 *
 * Un documento cuyo XML del SII o del ERP está guardado se puede reimprimir
 * tal cual (el PDF se arma desde el XML) y es el que vale como respaldo
 * tributario. Marcarlo evita tener que abrir el documento para saberlo.
 */
export function XmlBadge({ tieneXml }: { tieneXml: boolean }) {
  if (!tieneXml) return null;
  return (
    <span
      title="Tiene el XML cargado: se puede reimprimir tal cual"
      className="mt-0.5 inline-block rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
    >
      XML
    </span>
  );
}
