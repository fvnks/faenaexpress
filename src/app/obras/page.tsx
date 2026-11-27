import Link from "next/link";

import { CambiarObraLink } from "@/components/cambiar-obra-link";
import { getActiveMembership } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP } from "@/lib/money";
import { requireObraContext, visibleObras } from "@/lib/obra-auth";
import { necesitaAtencion } from "@/lib/obra-documentacion";
import {
  canAccessObra,
  obraRoleLabel,
  obraStatusLabel,
  type ObraSection,
} from "@/lib/obra-permissions";
import { cargarPresupuesto } from "@/lib/obra-presupuesto";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

function pct(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2).replace(".", ",")}%`;
}

type Pendiente = {
  label: string;
  detalle: string;
  href: string;
  section: ObraSection;
  urgente?: boolean;
};

export default async function ObrasHomePage() {
  const ctx = await requireObraContext("panel");
  const { obra } = ctx;
  const [obras, active] = await Promise.all([visibleObras(ctx.user), getActiveMembership()]);
  const companyId = active?.company.id ?? "";

  const [
    { totales, sinImputar },
    borradores,
    facturados,
    cubicacionesPendientes,
    documentos,
    maquinarias,
    imputados,
  ] = await Promise.all([
    cargarPresupuesto(obra.id),
    db.estadoPago.findMany({
      where: { obraId: obra.id, estado: "BORRADOR" },
      select: { total: true },
    }),
    db.estadoPago.findMany({
      where: { obraId: obra.id, estado: { in: ["FACTURADO", "PAGADO"] } },
      select: { total: true },
    }),
    db.cubicacion.count({ where: { partida: { obraId: obra.id }, aprobada: false } }),
    db.documentoObra.findMany({
      where: { obraId: obra.id },
      select: { estado: true, fechaVencimiento: true },
    }),
    db.maquinaria.findMany({
      where: { obraId: obra.id, activa: true },
      select: { horometro: true, proximaMantencion: true },
    }),
    db.costoObra.findMany({
      where: { sourceType: { in: ["PURCHASE", "EXPENSE"] } },
      select: { sourceType: true, sourceId: true },
    }),
  ]);

  const comprasImputadas = imputados.filter((c) => c.sourceType === "PURCHASE").map((c) => c.sourceId);
  const gastosImputados = imputados.filter((c) => c.sourceType === "EXPENSE").map((c) => c.sourceId);
  const [comprasSinImputar, gastosSinImputar] = companyId
    ? await Promise.all([
        db.purchase.count({ where: { companyId, id: { notIn: comprasImputadas } } }),
        db.expense.count({ where: { companyId, id: { notIn: gastosImputados } } }),
      ])
    : [0, 0];

  const totalBorrador = borradores.reduce((sum, e) => sum + e.total, 0);
  const totalFacturado = facturados.reduce((sum, e) => sum + e.total, 0);
  const documentosVencidos = documentos.filter((d) => necesitaAtencion(d.estado, d.fechaVencimiento)).length;
  const mantencionesVencidas = maquinarias.filter(
    (m) => m.proximaMantencion != null && m.horometro >= m.proximaMantencion,
  ).length;

  const pendientes: Pendiente[] = [
    ...(cubicacionesPendientes > 0
      ? [{
          label: `${cubicacionesPendientes} ${cubicacionesPendientes === 1 ? "cubicación por aprobar" : "cubicaciones por aprobar"}`,
          detalle: "Avance registrado esperando aprobación",
          href: "/obras/avance",
          section: "avance" as const,
        }]
      : []),
    ...(borradores.length > 0
      ? [{
          label: `${borradores.length} ${borradores.length === 1 ? "estado de pago en borrador" : "estados de pago en borrador"}`,
          detalle: formatCLP(totalBorrador),
          href: "/obras/estados-pago",
          section: "estadosPago" as const,
        }]
      : []),
    ...(documentosVencidos > 0
      ? [{
          label: `${documentosVencidos} ${documentosVencidos === 1 ? "documento vencido" : "documentos vencidos"}`,
          detalle: "Contratos, permisos o certificados por regularizar",
          href: "/obras/documentos?estado=VENCIDOS",
          section: "documentos" as const,
          urgente: true,
        }]
      : []),
    ...(comprasSinImputar > 0
      ? [{
          label: `${comprasSinImputar} ${comprasSinImputar === 1 ? "compra sin imputar" : "compras sin imputar"}`,
          detalle: "Conéctalas a una partida para que lleguen al costo real",
          href: "/obras/compras",
          section: "compras" as const,
        }]
      : []),
    ...(gastosSinImputar > 0
      ? [{
          label: `${gastosSinImputar} ${gastosSinImputar === 1 ? "gasto sin imputar" : "gastos sin imputar"}`,
          detalle: "Conéctalos a una partida para que lleguen al costo real",
          href: "/obras/gastos",
          section: "gastos" as const,
        }]
      : []),
    ...(sinImputar > 0
      ? [{
          label: "Costos sin imputar a partida",
          detalle: formatCLP(sinImputar),
          href: "/obras/presupuesto",
          section: "presupuesto" as const,
        }]
      : []),
    ...(mantencionesVencidas > 0
      ? [{
          label: `${mantencionesVencidas} ${mantencionesVencidas === 1 ? "equipo con mantención vencida" : "equipos con mantención vencida"}`,
          detalle: "Horómetro sobre el umbral programado",
          href: "/obras/maquinaria",
          section: "maquinaria" as const,
          urgente: true,
        }]
      : []),
  ].filter((p) => canAccessObra(ctx.role, p.section));

  const accesos = [
    { href: "/obras/presupuesto", label: "Presupuesto", detalle: "Itemizado, APU y desviación", section: "presupuesto" as const },
    { href: "/obras/avance", label: "Avance", detalle: "Cubicaciones y aprobación", section: "avance" as const },
    { href: "/obras/estados-pago", label: "Estados de pago", detalle: "Cobrar por avance ejecutado", section: "estadosPago" as const },
    { href: "/obras/documentos", label: "Control documental", detalle: "Contratos, planos y permisos", section: "documentos" as const },
  ].filter((a) => canAccessObra(ctx.role, a.section));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Índice / 01 — Obra activa
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{obra.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {obraStatusLabel(obra.status)} · {obraRoleLabel(ctx.role)} en esta obra
          {obra.mandante ? ` · Mandante: ${obra.mandante}` : ""}
        </p>
      </div>

      <section className={`${cardClass} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Mis obras</h2>
          <Link href="/obras/mis-obras" className="text-xs text-primary hover:underline">
            Ver todas →
          </Link>
        </div>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          Puedes trabajar en varias obras a la vez. Abre la que necesites; el cambio conserva la sección.
        </p>
        <ul className="divide-y divide-border">
          {obras.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                {item.code ? <span className="font-mono text-xs text-muted-foreground">{item.code}</span> : null}
              </span>
              {item.id === obra.id ? (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Abierta</span>
              ) : (
                <CambiarObraLink obraId={item.id} nombre={item.name} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Obligado", value: formatCLP(totales.obligado), tone: "text-foreground" },
          { label: "Costo real", value: formatCLP(totales.real), tone: "text-primary" },
          {
            label: "Desviación",
            value: totales.real === 0 ? "—" : `${formatCLP(totales.desviacion)} · ${pct(totales.desviacionPct)}`,
            tone: totales.desviacion > 0 ? "text-danger" : "text-success",
          },
          { label: "Avance físico", value: `${(totales.avanceFisico * 100).toFixed(1)}%`, tone: "text-foreground" },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`tabular mt-1 text-xl font-bold ${kpi.tone}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>{totales.partidas} partidas vigentes</span>
        <span>Avance valorizado: <span className="tabular text-foreground">{formatCLP(totales.avanceValorizado)}</span></span>
        <span>Facturado (EP): <span className="tabular text-foreground">{formatCLP(totalFacturado)}</span></span>
      </div>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Pendientes de la obra</h2>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          Todo se deriva de los documentos y mediciones ya registrados.
        </p>
        {pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pendientes. La obra está al día.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pendientes.map((p) => (
              <li key={p.href} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${p.urgente ? "bg-danger" : "bg-accent"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-xs text-muted-foreground">{p.detalle}</span>
                </span>
                <Link href={p.href} className="text-xs text-primary hover:underline">
                  Ir a la sección →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Accesos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {accesos.map((a) => (
            <Link key={a.href} href={a.href} className={`${cardClass} p-4 transition-colors hover:border-primary`}>
              <span className="block text-sm font-semibold">{a.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{a.detalle}</span>
            </Link>
          ))}
        </div>
      </section>

      {canAccessObra(ctx.role, "administracion") ? (
        <div>
          <Link href="/obras/administracion" className={secondaryButtonClass}>
            Configuración de la obra
          </Link>
        </div>
      ) : null}
    </div>
  );
}
