import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateExpense } from "@/app/actions/expenses";
import { ExpenseForm } from "@/app/dashboard/gastos/expense-form";
import { canWrite, requireContext } from "@/lib/auth";
import { listAreas, listCategories, listPayers, listWorkers } from "@/lib/catalogs";
import { getExpense, serializeExpense } from "@/lib/expenses";
import { todayISO } from "@/lib/money";

export default async function EditExpensePage(props: PageProps<"/dashboard/gastos/[id]/editar">) {
  const ctx = await requireContext("gastos");
  if (!canWrite(ctx, "gastos")) {
    redirect("/dashboard/gastos");
  }

  const { id } = await props.params;

  const [expense, categories, areas, payers, workers] = await Promise.all([
    getExpense(ctx.company.id, id),
    listCategories(ctx.company.id),
    listAreas(ctx.company.id),
    listPayers(ctx.company.id),
    listWorkers(ctx.company.id),
  ]);

  if (!expense) {
    notFound();
  }

  const action = updateExpense.bind(null, expense.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/gastos/${expense.id}`}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Volver al detalle
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Editar gasto</h1>
        <p className="mt-1 text-sm text-muted-foreground">{expense.description}</p>
      </div>

      <ExpenseForm
        action={action}
        categories={categories}
        areas={areas}
        payers={payers}
        workers={workers}
        ivaRate={ctx.company.ivaRate}
        today={todayISO()}
        defaults={serializeExpense(expense)}
      />
    </div>
  );
}
