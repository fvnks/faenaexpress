import { NotasScreen } from "@/app/facturas/ventas/notas/notas-screen";

export default async function NotaCreditoPage(props: PageProps<"/facturas/ventas/nota-credito">) {
  const searchParams = await props.searchParams;
  return <NotasScreen kind="CREDIT_NOTE" searchParams={searchParams} />;
}
