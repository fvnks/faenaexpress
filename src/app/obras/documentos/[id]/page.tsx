import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import {
  alertaVencimiento,
  diasParaVencer,
  ESTADO_DOCUMENTO_LABELS,
  TIPO_DOCUMENTO_LABELS,
} from "@/lib/obra-documentacion";
import { cardClass } from "@/lib/ui";
import { EditarDocumento } from "./editar-documento";
import { EliminarDocumento } from "./eliminar-documento";
import { SeguimientoForm } from "./seguimiento-form";

const ALERTA_CLASE: Record<string, string> = {
  VENCIDO: "bg-danger-soft text-danger",
  POR_VENCER: "bg-accent-soft text-accent",
  AL_DIA: "bg-success-soft text-success",
  SIN_FECHA: "bg-surface-elevated text-muted-foreground",
};
const ALERTA_TEXTO: Record<string, string> = {
  VENCIDO: "Vencido",
  POR_VENCER: "Por vencer",
  AL_DIA: "Al día",
  SIN_FECHA: "Sin fecha",
};

export default async function DocumentoObraDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireObraContext("documentos");
  const { id } = await params;
  const writable = obraCanWrite(ctx, "documentos");

  const [doc, responsables] = await Promise.all([
    db.documentoObra.findFirst({
      where: { id, obraId: ctx.obra.id },
      include: {
        responsable: { select: { name: true } },
        createdBy: { select: { name: true } },
        seguimientos: {
          orderBy: { fecha: "desc" },
          include: { createdBy: { select: { name: true } } },
        },
      },
    }),
    db.obraMembership.findMany({
      where: { obraId: ctx.obra.id, active: true },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  if (!doc) notFound();

  const alerta = alertaVencimiento(doc.fechaVencimiento);
  const dias = diasParaVencer(doc.fechaVencimiento);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Control documental / Ficha
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{doc.titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href="/obras/documentos" className="text-primary hover:underline">← Volver al control documental</Link>
        </p>
        {writable ? (
          <div className="mt-3 flex justify-end">
            <EliminarDocumento documentoId={doc.id} titulo={doc.titulo} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium">
          {TIPO_DOCUMENTO_LABELS[doc.tipo as keyof typeof TIPO_DOCUMENTO_LABELS] ?? doc.tipo}
        </span>
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
          {ESTADO_DOCUMENTO_LABELS[doc.estado as keyof typeof ESTADO_DOCUMENTO_LABELS] ?? doc.estado}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${ALERTA_CLASE[alerta]}`}>
          {ALERTA_TEXTO[alerta]}
          {dias !== null && alerta !== "AL_DIA" ? ` · ${dias < 0 ? `${Math.abs(dias)}d de atraso` : `${dias}d`}` : ""}
        </span>
      </div>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Datos del documento</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Responsable</dt>
            <dd className="mt-0.5 font-medium">{doc.responsable?.name ?? "Sin asignar"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Vencimiento</dt>
            <dd className="mt-0.5 tabular font-medium">
              {doc.fechaVencimiento ? formatDate(doc.fechaVencimiento) : "Sin fecha"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Creado por</dt>
            <dd className="mt-0.5">{doc.createdBy.name} · {formatDate(doc.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Archivo</dt>
            <dd className="mt-0.5">
              {doc.fileName ? (
                <a href={`/obras/documentos/${doc.id}/archivo`} className="text-primary hover:underline">
                  {doc.fileName} · {new Intl.NumberFormat("es-CL").format(doc.sizeBytes ?? 0)} bytes
                </a>
              ) : (
                <span className="text-muted-foreground">Sin archivo adjunto</span>
              )}
            </dd>
          </div>
          {doc.descripcion ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Descripción</dt>
              <dd className="mt-0.5">{doc.descripcion}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {writable ? (
        <EditarDocumento
          documentoId={doc.id}
          titulo={doc.titulo}
          tipo={doc.tipo}
          responsables={responsables.map((m) => m.user)}
          responsableId={doc.responsableId}
          fechaVencimiento={doc.fechaVencimiento ? doc.fechaVencimiento.toISOString().slice(0, 10) : ""}
          descripcion={doc.descripcion}
          fileName={doc.fileName}
        />
      ) : null}

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Historial de seguimiento</h2>
        <ol className="mt-4 space-y-0">
          {doc.seguimientos.map((s, index) => (
            <li key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
              <div className="flex flex-col items-center">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${s.estado === "APROBADO" ? "bg-success" : s.estado === "RECHAZADO" ? "bg-danger" : "bg-primary"}`} />
                {index < doc.seguimientos.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm font-medium">
                    {ESTADO_DOCUMENTO_LABELS[s.estado as keyof typeof ESTADO_DOCUMENTO_LABELS] ?? s.estado}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.fecha)} · {s.createdBy.name}
                  </span>
                </div>
                {s.nota ? <p className="mt-1 text-sm text-muted-foreground">{s.nota}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {writable ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Registrar seguimiento</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
            Cada cambio queda en el historial con fecha y persona; el estado de la ficha se actualiza solo.
          </p>
          <SeguimientoForm documentoId={doc.id} estadoActual={doc.estado} />
        </section>
      ) : null}
    </div>
  );
}
