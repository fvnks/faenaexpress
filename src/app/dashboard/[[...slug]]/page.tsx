import { permanentRedirect } from "next/navigation";

/**
 * Compatibilidad de rutas: el módulo Facturas vivía en `/dashboard`.
 * Cualquier marcador o enlace viejo llega aquí y va a la ruta nueva con un
 * redirect permanente (308), para que el navegador lo aprenda.
 */
export default async function DashboardLegacyRedirect({
  params,
}: PageProps<"/dashboard/[[...slug]]">) {
  const { slug } = await params;
  permanentRedirect(slug?.length ? `/facturas/${slug.join("/")}` : "/facturas");
}
