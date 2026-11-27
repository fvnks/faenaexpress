// Alias de `/pdf-factura`: no hay TED real para una carta DTE (ver la ruta de ventas).

import { redirect } from "next/navigation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  redirect(`/facturas/compras/${id}/pdf-factura`);
}
