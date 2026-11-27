/** Activa una obra por API y devuelve la ruta a la que debe navegar el navegador. */
export async function activarObra(obraId: string, destino?: string): Promise<string> {
  const respuesta = await fetch("/api/obras/activar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ obraId, destino }),
  });
  const data = (await respuesta.json().catch(() => ({}))) as { href?: string; error?: string };
  if (!respuesta.ok) throw new Error(data.error ?? "No se pudo cambiar de obra.");
  return data.href ?? "/obras";
}
