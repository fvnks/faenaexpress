import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteAbsence, deleteRemuneration, deleteWorkerDocument, uploadWorkerDocument } from "@/app/actions/rrhh";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { canWrite, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { remunerationTypeLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";
import { listAreas } from "@/lib/catalogs";
import { workerRemunerationHistory } from "@/lib/rrhh";
import { cardClass } from "@/lib/ui";
import { AbsenceForm, DocumentUploadForm, WorkerRowForm } from "../../rrhh-forms";

export default async function TrabajadorDetailPage(props: PageProps<"/dashboard/rrhh/trabajadores/[id]">) {
  const ctx = await requireContext("rrhh");
  const writable = canWrite(ctx, "rrhh");
  const params = await props.params;
  const id = params.id;

  const [worker, remunerations, areas, absences, documents] = await Promise.all([
    db.worker.findFirst({ where: { id, companyId: ctx.company.id }, include: { area: { select: { id: true, name: true } } } }),
    workerRemunerationHistory(ctx.company.id, id),
    listAreas(ctx.company.id),
    db.absence.findMany({ where: { workerId: id, companyId: ctx.company.id }, orderBy: { startDate: "desc" } }),
    db.workerDocument.findMany({ where: { workerId: id, companyId: ctx.company.id }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, type: true, fileName: true, sizeBytes: true, createdAt: true } }),
  ]);

  if (!worker) notFound();

  const total = remunerations.reduce((acc, rem) => acc + rem.amount, 0);
  const workerForForm = {
    id: worker.id,
    name: worker.name,
    rut: worker.rut,
    active: worker.active,
    position: worker.position,
    areaId: worker.areaId,
    email: worker.email,
    phone: worker.phone,
    address: worker.address,
    city: worker.city,
    birthDate: worker.birthDate,
    hireDate: worker.hireDate,
    terminationDate: worker.terminationDate,
    contractType: worker.contractType,
    status: worker.status,
    baseAmount: worker.baseAmount,
    bankName: worker.bankName,
    bankAccount: worker.bankAccount,
    afp: worker.afp,
    healthPlan: worker.healthPlan,
    notes: worker.notes,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/rrhh" className="text-sm text-primary underline-offset-2 hover:underline">
          ← Volver a RRHH
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{worker.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ficha y pagos registrados.
        </p>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Ficha</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Cargo</dt><dd>{worker.position ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Área</dt><dd>{worker.area?.name ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">RUT</dt><dd>{worker.rut ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Estado</dt><dd>{worker.status ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Activo</dt><dd>{worker.active ? "Sí" : "No"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Correo</dt><dd>{worker.email ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Teléfono</dt><dd>{worker.phone ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Comuna/ciudad</dt><dd>{worker.city ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Dirección</dt><dd>{worker.address ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Ingreso</dt><dd>{worker.hireDate ? formatDate(worker.hireDate) : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Término contrato</dt><dd>{worker.terminationDate ? formatDate(worker.terminationDate) : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Tipo de contrato</dt><dd>{worker.contractType ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Sueldo base mensual</dt><dd>{worker.baseAmount != null ? formatCLP(worker.baseAmount) : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">AFP</dt><dd>{worker.afp ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Previsión/salud</dt><dd>{worker.healthPlan ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Banco</dt><dd>{worker.bankName ?? "—"} {worker.bankAccount ? `· ${worker.bankAccount}` : ""}</dd></div>
          <div className="sm:col-span-2 lg:col-span-3"><dt className="text-xs text-muted-foreground">Notas</dt><dd>{worker.notes ?? "—"}</dd></div>
        </dl>
      </section>

      {writable ? (
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Editar ficha</h2>
          <div className="mt-4">
            <WorkerRowForm worker={workerForForm} areas={areas} />
          </div>
        </section>
      ) : null}

      <section className={cardClass + " overflow-hidden"}>
        <h2 className="border-b border-border px-4 py-3 font-semibold">Pagos registrados</h2>
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Total pagado: <span className="font-semibold">{formatCLP(total)}</span> en {remunerations.length} registro(s).
        </p>
        {remunerations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Sin pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Período</th>
                  <th className="px-4 py-2 text-right font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">Pagado por</th>
                  {writable ? <th className="px-4 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {remunerations.map((rem) => (
                  <tr key={rem.id} className="border-b border-border last:border-0">
                    <td className="tabular whitespace-nowrap px-4 py-2.5">{formatDate(rem.date)}</td>
                    <td className="px-4 py-2.5">{remunerationTypeLabel(rem.type)}</td>
                    <td className="tabular px-4 py-2.5 text-muted-foreground">{rem.period ?? "—"}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2.5 text-right font-semibold">{formatCLP(rem.amount)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{rem.paidBy.name}</td>
                    {writable ? (
                      <td className="px-4 py-2.5 text-right">
                        <form action={deleteRemuneration}>
                          <input type="hidden" name="id" value={rem.id} />
                          <ConfirmSubmit message={`¿Eliminar el pago ${rem.id}?`} className="text-sm text-danger underline-offset-2 hover:underline">
                            Eliminar
                          </ConfirmSubmit>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Ausencias y licencias */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Ausencias y licencias</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Enfermedad, vacaciones, permisos y su estatus.
        </p>
        {writable ? (
          <div className="mt-4">
            <AbsenceForm workerId={worker.id} today={new Date().toISOString().slice(0, 10)} />
          </div>
        ) : null}
        {absences.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sin ausencias registradas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Desde</th>
                  <th className="px-4 py-2 font-medium">Hasta</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Remunerada</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {absences.map((absence) => (
                  <tr key={absence.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{absence.type}</td>
                    <td className="tabular px-4 py-2.5">{new Date(absence.startDate).toISOString().slice(0, 10)}</td>
                    <td className="tabular px-4 py-2.5">{new Date(absence.endDate).toISOString().slice(0, 10)}</td>
                    <td className="px-4 py-2.5">{absence.status}</td>
                    <td className="px-4 py-2.5">{absence.paid ? "Si" : "No"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {writable ? (
                        <form action={deleteAbsence}>
                          <input type="hidden" name="id" value={absence.id} />
                          <ConfirmSubmit message="Eliminar ausencia?" className="text-sm text-danger underline-offset-2 hover:underline">
                            Eliminar
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Documentos adjuntos */}
      <section className={cardClass + " p-5"}>
        <h2 className="font-semibold">Documentos adjuntos</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Contratos, anexos y certificados (max 5 MB).
        </p>
        {writable ? (
          <div className="mt-4">
            <DocumentUploadForm workerId={worker.id} />
          </div>
        ) : null}
        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sin documentos adjuntos.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Titulo</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Archivo</th>
                  <th className="px-4 py-2 text-right font-medium">Tamano</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">{doc.title}</td>
                    <td className="px-4 py-2.5">{doc.type}</td>
                    <td className="px-4 py-2.5">
                      <a href={"/dashboard/rrhh/trabajadores/" + worker.id + "/documentos/" + doc.id + "/download"} className="text-primary underline-offset-2 hover:underline">
                        {doc.fileName}
                      </a>
                    </td>
                    <td className="tabular px-4 py-2.5 text-right">{Math.round(doc.sizeBytes / 1024)} KB</td>
                    <td className="px-4 py-2.5 text-right">
                      {writable ? (
                        <form action={deleteWorkerDocument}>
                          <input type="hidden" name="id" value={doc.id} />
                          <input type="hidden" name="workerId" value={worker.id} />
                          <ConfirmSubmit message="Eliminar documento?" className="text-sm text-danger underline-offset-2 hover:underline">
                            Eliminar
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

            </section>
    </div>
  );
}
