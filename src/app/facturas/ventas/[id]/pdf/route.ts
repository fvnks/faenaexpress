// La carta DTE se unificó con la factura comercial: esta app NO emite DTE
// propios (importa los documentos del SII), así que no tiene un TED real para
// timbrar. Mantener un PDF con timbre fabricado sería engañoso. La ruta queda
// como alias de `/pdf-factura` para no romper los enlaces existentes.

import { redirect } from "next/navigation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  redirect(`/facturas/ventas/${id}/pdf-factura`);
}
