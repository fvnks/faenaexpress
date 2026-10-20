import Link from "next/link";
import { redirect } from "next/navigation";

import { createExpense } from "@/app/actions/expenses";
import { ExpenseForm } from "@/app/facturas/gastos/expense-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories, listPayers, listWorkers } from "@/lib/catalogs";
import type { ExpenseForForm } from "@/lib/expenses";
import { paymentMethodLabel } from "@/lib/labels";
import { formatCLP, formatDate, todayISO } from "@/lib/money";
import { paymentMethodOptions } from "@/lib/payment-methods";
import { cardClass, primaryButtonClass } from "@/lib/ui";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Alta desde un movimiento bancario: la glosa, la fecha, el monto y el medio de
 * pago llegan en la URL (los arma la bandeja de Banco). El monto del banco viene
 * con IVA incluido, así que se separa en neto e IVA; los dos quedan editables,
 * porque no todo cargo lleva IVA.
 */
function prefillFromBank(
  params: Record<string, string | string[] | undefined>,
  ivaRate: number,
): Partial<ExpenseForForm> | undefined {
  const total = Math.round(Number(one(params.monto)));
  if (!Number.isFinite(total) || total <= 0) return undefined;

  const rawDate = one(params.fecha) ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;
  const rawPayment = one(params.pago) ?? "";
  const net = Math.round(total / (1 + ivaRate / 100));

  return {
    description: (one(params.descripcion) ?? "").trim().slice(0, 300),
    date,
    netAmount: net,
    ivaAmount: total - net,
    paymentMethod: paymentMethodLabel(rawPayment) || "Transferencia",
    notes: date
      ? `Origen: movimiento bancario del ${formatDate(new Date(`${date}T00:00:00.000Z`))} por ${formatCLP(total)}.`
      : undefined,
  };
}

export default async function NewExpensePage(props: PageProps<"/facturas/gastos/nueva">) {
  const ctx = await requireContext("gastos");
  if (!canWrite(ctx, "gastos")) {
    redirect("/facturas/gastos");
  }

  const [categories, areas, payers, workers] = await Promise.all([
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
    listPayers(ctx.company.id),
    listWorkers(ctx.company.id),
  ]);

  // Las formas de pago que ofrece la empresa: su catálogo más las base.
  const formasDePago = await paymentMethodOptions(ctx.company.id);

  const searchParams = await props.searchParams;
  const prefill = prefillFromBank(searchParams, ctx.company.ivaRate);
  const rawVolver = one(searchParams.volver);
  const volver = rawVolver?.startsWith("/facturas/") ? rawVolver : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/facturas/gastos"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Gastos
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nuevo gasto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {prefill
            ? "Gasto de un movimiento bancario. El monto llega con IVA incluido: ajústalo si el cargo no lo lleva."
            : "Registra un gasto y quién lo pagó."}
        </p>
      </div>

      {payers.length === 0 ? (
        <div className={cardClass + " p-6"}>
          <p className="font-medium">Necesitas al menos un pagador.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea quién paga los gastos (una persona o la caja de la empresa) en Catálogos.
          </p>
          <Link href="/facturas/catalogos" className={primaryButtonClass + " mt-4 inline-block"}>
            Ir a Catálogos
          </Link>
        </div>
      ) : (
        <ExpenseForm
        formasDePago={formasDePago}
          action={createExpense}
          categories={categories}
          areas={areas}
          payers={payers}
          workers={workers}
          ivaRate={ctx.company.ivaRate}
          today={todayISO()}
          prefill={prefill}
          volver={volver}
        />
      )}
    </div>
  );
}
