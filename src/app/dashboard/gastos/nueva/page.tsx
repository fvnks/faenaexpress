import Link from "next/link";
import { redirect } from "next/navigation";

import { createExpense } from "@/app/actions/expenses";
import { ExpenseForm } from "@/app/dashboard/gastos/expense-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories, listPayers, listWorkers } from "@/lib/catalogs";
import { todayISO } from "@/lib/money";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default async function NewExpensePage() {
  const ctx = await requireContext("gastos");
  if (!canWrite(ctx, "gastos")) {
    redirect("/dashboard/gastos");
  }

  const [categories, areas, payers, workers] = await Promise.all([
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
    listPayers(ctx.company.id),
    listWorkers(ctx.company.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/gastos"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Gastos
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nuevo gasto</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registra un gasto y quién lo pagó.</p>
      </div>

      {payers.length === 0 ? (
        <div className={cardClass + " p-6"}>
          <p className="font-medium">Necesitas al menos un pagador.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea quién paga los gastos (una persona o la caja de la empresa) en Catálogos.
          </p>
          <Link href="/dashboard/catalogos" className={primaryButtonClass + " mt-4 inline-block"}>
            Ir a Catálogos
          </Link>
        </div>
      ) : (
        <ExpenseForm
          action={createExpense}
          categories={categories}
          areas={areas}
          payers={payers}
          workers={workers}
          ivaRate={ctx.company.ivaRate}
          today={todayISO()}
        />
      )}
    </div>
  );
}
