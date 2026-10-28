import Link from "next/link";

import { requireContext } from "@/lib/auth";
import { listPosCatalog } from "@/lib/pos";
import { EtiquetasClient } from "@/components/etiquetas-client";

export default async function PosEtiquetasPage() {
  const ctx = await requireContext();
  const products = await listPosCatalog(ctx.company.id);

  return <EtiquetasClient products={products} />;
}
