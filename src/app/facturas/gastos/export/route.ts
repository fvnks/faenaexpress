import { requireContext } from "@/lib/auth";
import { listAllExpenses, parseExpenseFilters } from "@/lib/expenses";
import { csvResponse, toCsv } from "@/lib/csv";
import { paymentMethodLabel } from "@/lib/labels";
import { formatDate, todayISO } from "@/lib/money";

/** CSV de todos los gastos filtrados (sin paginar), con los mismos filtros que la lista. */
export async function GET(request: Request) {
  const ctx = await requireContext("gastos");
  const params = new URL(request.url).searchParams;
  const get = (key: string) => params.get(key) ?? undefined;

  const filters = parseExpenseFilters({
    q: get("q"),
    categoria: get("categoria"),
    pagador: get("pagador"),
    trabajador: get("trabajador"),
    reembolso: get("reembolso"),
    desde: get("desde"),
    hasta: get("hasta"),
    orden: get("orden"),
    dir: get("dir"),
  });

  const rows = await listAllExpenses(ctx.company.id, filters);

  const csv = toCsv(
    ["Fecha", "Descripción", "Categoría", "Centro de costo", "Área", "Documento", "Pagado por", "Medio de pago", "Total", "Reembolsado", "Fecha reembolso"],
    rows.map((expense) => [
      formatDate(expense.date),
      expense.description,
      expense.category?.name ?? "",
      expense.centroCosto?.nombre ?? "",
      expense.area?.name ?? "",
      expense.documentNumber ?? "",
      expense.paidBy.name,
      paymentMethodLabel(expense.paymentMethod),
      expense.totalAmount,
      expense.reimbursed ? "Sí" : "No",
      expense.reimbursedAt ? formatDate(expense.reimbursedAt) : "",
    ]),
  );

  return csvResponse(`gastos-${todayISO()}.csv`, csv);
}
