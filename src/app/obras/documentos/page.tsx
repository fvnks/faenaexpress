import Link from "next/link";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { obraCanWrite, requireObraContext } from "@/lib/obra-auth";
import {
  alertaVencimiento,
  ESTADO_DOCUMENTO_LABELS,
  necesitaAtencion,
  TIPO_DOCUMENTO_LABELS,
} from "@/lib/obra-documentacion";
import { cardClass } from "@/lib/ui";
import { NuevoDocumento } from "./nuevo-documento";
import { IndiceAutomatico } from "./indice-automatico";

const fmt = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);

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
const ESTADO_CLASE: Record<string, string> = {
  PENDIENTE: "bg-surface-elevated text-muted-foreground",
  EN_GESTION: "bg-accent-soft text-accent",
  RECIBIDO: "bg-primary-soft text-primary",
  APROBADO: "bg-success-soft text-success",
  RECHAZADO: "bg-danger-soft text-danger",
};

const FILTROS = [
  { valor: "", texto: "Todos" },
  { valor: "PENDIENTE", texto: "Pendientes" },
  { valor: "EN_GESTION", texto: "En gestión" },
  { valor: "RECIBIDO", texto: "Recibidos" },
  { valor: "APROBADO", texto: "Aprobados" },
  { valor: "RECHAZADO", texto: "Rechazados" },
  { valor: "VENCIDOS", texto: "Vencidos" },
];

export default async function ObraDocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const ctx = await requireObraContext("documentos");
  const writable = obraCanWrite(ctx, "documentos");
  const params = await searchParams;
  const filtro = params.estado ?? "";

  const [documentos, responsables] = await Promise.all([
    db.documentoObra.findMany({
      where: { obraId: ctx.obra.id },
      orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "desc" }],
      include: {
        responsable: { select: { name: true } },
        seguimientos: { orderBy: { fecha: "desc" }, take: 1 },
      },
    }),
    db.obraMembership.findMany({
      where: { obraId: ctx.obra.id, active: true },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const visibles = documentos.filter((d) => {
    if (!filtro) return true;
    if (filtro === "VENCIDOS") return necesitaAtencion(d.estado, d.fechaVencimiento);
    return d.estado === filtro;
  });
  const vencidos = documentos.filter((d) => necesitaAtencion(d.estado, d.fechaVencimiento)).length;
  const sinResolver = documentos.filter((d) => d.estado === "PENDIENTE" || d.estado === "EN_GESTION").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / 11 — Control documental</p>
        <h1 className="text-2xl font-bold tracking-tight">Documentación de {ctx.obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea documentos, asigna responsables, controla vencimientos y registra cada avance en su historial.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Documentos", value: String(documentos.length) },
          { label: "Sin resolver", value: String(sinResolver) },
          { label: "Vencidos", value: String(vencidos) },
          { label: "Aprobados", value: String(documentos.filter((d) => d.estado === "APROBADO").length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {writable ? <NuevoDocumento responsables={responsables.map((m) => m.user)} /> : null}

      <nav aria-label="Filtrar documentación" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor ? `/obras/documentos?estado=${f.valor}` : "/obras/documentos"}
            aria-current={filtro === f.valor ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filtro === f.valor
                ? "border-primary bg-primary-soft font-medium text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {f.texto}
          </Link>
        ))}
      </nav>

      <section className={`${cardClass} overflow-x-auto`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Control de documentos</h2>
        </div>
        {visibles.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {documentos.length === 0
              ? "Todavía no hay documentos en control. Crea el primero con el formulario de arriba."
              : "No hay documentos con ese filtro."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky-table-head text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Documento</th>
                <th className="px-3 py-2 text-left">Responsable</th>
                <th className="px-3 py-2 text-left">Vencimiento</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Último seguimiento</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibles.map((d) => {
                const alerta = alertaVencimiento(d.fechaVencimiento);
                const ultimo = d.seguimientos[0];
                return (
                  <tr key={d.id}>
                    <td className="px-3 py-2">
                      <span className="font-medium">{d.titulo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {TIPO_DOCUMENTO_LABELS[d.tipo as keyof typeof TIPO_DOCUMENTO_LABELS] ?? d.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{d.responsable?.name ?? "Sin asignar"}</td>
                    <td className="px-3 py-2">
                      <span className="tabular text-xs">{d.fechaVencimiento ? formatDate(d.fechaVencimiento) : "—"}</span>
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${ALERTA_CLASE[alerta]}`}>
                        {ALERTA_TEXTO[alerta]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASE[d.estado] ?? ESTADO_CLASE.PENDIENTE}`}>
                        {ESTADO_DOCUMENTO_LABELS[d.estado as keyof typeof ESTADO_DOCUMENTO_LABELS] ?? d.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {ultimo ? `${formatDate(ultimo.fecha)} · ${ESTADO_DOCUMENTO_LABELS[ultimo.estado as keyof typeof ESTADO_DOCUMENTO_LABELS] ?? ultimo.estado}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/obras/documentos/${d.id}`} className="text-xs text-primary hover:underline">Ver seguimiento</Link>
                        {d.fileName ? (
                          <a href={`/obras/documentos/${d.id}/archivo`} className="text-xs text-primary hover:underline">Archivo</a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <IndiceAutomatico obraId={ctx.obra.id} fmt={fmt} />
    </div>
  );
}
