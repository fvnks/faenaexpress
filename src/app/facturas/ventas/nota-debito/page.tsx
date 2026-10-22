import { NotasScreen } from "@/app/facturas/ventas/notas/notas-screen";

export default async function NotaDebitoPage(props: PageProps<"/facturas/ventas/nota-debito">) {
  const searchParams = await props.searchParams;
  return <NotasScreen kind="DEBIT_NOTE" searchParams={searchParams} />;
}
