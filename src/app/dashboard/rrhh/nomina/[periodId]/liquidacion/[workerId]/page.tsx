import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP } from "@/lib/money";
import { PrintButton } from "@/components/print-button";
import { payrollStatusLabels } from "@/lib/payroll";

export default async function LiquidacionPage(props: PageProps<"/dashboard/rrhh/nomina/[periodId]/liquidacion/[workerId]">) {
  const ctx = await requireContext("rrhh");
  const params = await props.params;
  const period = await db.payrollPeriod.findFirst({ where: { id: params.periodId, companyId: ctx.company.id } });
  const entry = await db.payrollEntry.findFirst({
    where: { periodId: params.periodId, workerId: params.workerId },
    include: { worker: true },
  });
  if (!period || !entry) return <div className="p-6">No encontrado.</div>;
  const company = await db.company.findUnique({ where: { id: ctx.company.id } });

  return (
    <div className="mx-auto max-w-3xl p-8 print:p-0">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <h1 className="text-2xl font-bold">Liquidacion de Sueldo</h1>
      <div className="no-print mt-2 flex items-center gap-2">
        <p className="text-xs text-muted-foreground">Imprime con Ctrl+P o el boton.</p>
        <PrintButton />
      </div>
      <section className="mb-6">
        <h2 className="font-semibold">{company?.name ?? "Empresa"}</h2>
        {company?.address ? <p>{company.address}</p> : null}
        {company?.rut ? <p>RUT: {company.rut}</p> : null}
      </section>
      <section className="mb-6 grid grid-cols-2 gap-3 text-sm">
        <div><span className="font-semibold">Trabajador:</span> {entry.worker.name}</div>
        <div><span className="font-semibold">RUT:</span> {entry.worker.rut ?? "—"}</div>
        <div><span className="font-semibold">Antigüedad:</span> {entry.worker.hireDate ? entry.worker.hireDate.toISOString().slice(0, 10) : "—"}</div>
        <div><span className="font-semibold">Periodo:</span> {period.year}-{String(period.month).padStart(2, "0")}</div>
        <div><span className="font-semibold">Estado:</span> {payrollStatusLabels[period.status]}</div>
        <div><span className="font-semibold">Fecha pago:</span> {entry.paidAt ? entry.paidAt.toISOString().slice(0, 10) : "—"}</div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 text-left">Concepto</th>
            <th className="py-2 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2">Sueldo base</td>
            <td className="py-2 text-right">{formatCLP(entry.baseAmount)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">Bonos / asignaciones</td>
            <td className="py-2 text-right">{formatCLP(entry.allowances)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">Horas extra</td>
            <td className="py-2 text-right">{formatCLP(entry.overtime)}</td>
          </tr>
          <tr className="border-b border-border font-semibold">
            <td className="py-2">Total haberes</td>
            <td className="py-2 text-right">{formatCLP(entry.grossAmount)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">AFP ({company?.afpRate ?? 0}%)</td>
            <td className="py-2 text-right">-{formatCLP(entry.afpAmount)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">Salud ({company?.healthRate ?? 0}%)</td>
            <td className="py-2 text-right">-{formatCLP(entry.healthAmount)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">Seguro de cesantia ({company?.unemploymentRate ?? 0}%)</td>
            <td className="py-2 text-right">-{formatCLP(entry.unemploymentAmount)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">Otras deducciones</td>
            <td className="py-2 text-right">-{formatCLP(entry.otherDeductions)}</td>
          </tr>
          <tr className="border-b border-border font-semibold">
            <td className="py-2">Total descuentos</td>
            <td className="py-2 text-right">-{formatCLP(entry.deductionsTotal)}</td>
          </tr>
          <tr className="border-b border-border font-bold">
            <td className="py-2">Sueldo liquido</td>
            <td className="py-2 text-right">{formatCLP(entry.netAmount)}</td>
          </tr>
        </tbody>
      </table>
      {entry.notes ? <p className="mt-6 text-sm text-muted-foreground">Notas: {entry.notes}</p> : null}
      <div className="mt-10 grid grid-cols-2 gap-16 text-center text-sm no-print">
        <div>
          <div className="border-t border-border pt-2">Firma empleador</div>
        </div>
        <div>
          <div className="border-t border-border pt-2">Firma trabajador</div>
        </div>
      </div>
    </div>
  );
}