import { updateCentroCosto } from "@/app/actions/centros-costo";
import { Breadcrumb } from "@/components/breadcrumb";
import { canWrite, requireContext } from "@/lib/auth";
import { listCentrosCosto } from "@/lib/centros-costo";
import { db } from "@/lib/db";
import { cardClass } from "@/lib/ui";
import { EditarCentro, NuevoCentro } from "./centro-form";

export default async function CentrosCostoPage() {
  const ctx = await requireContext("catalogos");
  const writable = canWrite(ctx, "catalogos");
  const [centros, asignaciones] = await Promise.all([
    listCentrosCosto(ctx.company.id),
    db.repartoCentroCosto.count({ where: { companyId: ctx.company.id } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Panel", href: "/facturas", icon: "home" },
            { label: "Catálogos", href: "/facturas/catalogos", icon: "catalogos" },
            { label: "Centros de costo" },
          ]}
        />
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-primary">Índice / Catálogos</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Centros de costo</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cada compra o venta puede distribuirse entre varios centros. Los importes se guardan en CLP y deben sumar exactamente el total de la factura.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Centros activos", value: String(centros.filter((c) => c.active).length) },
          { label: "Centros inactivos", value: String(centros.filter((c) => !c.active).length) },
          { label: "Líneas asignadas", value: String(asignaciones) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${cardClass} p-4`}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {writable ? (
        <section className={`${cardClass} p-5`}>
          <h2 className="font-semibold">Nuevo centro de costo</h2>
          <div className="mt-3"><NuevoCentro /></div>
        </section>
      ) : null}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Catálogo</h2>
        </div>
        {centros.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Todavía no hay centros de costo. Créa el primero para poder repartir facturas.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {centros.map((centro) => (
              <li key={centro.id}>
                <details className="px-4 py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-mono text-xs text-primary">{centro.codigo}</span>
                    <span className="font-medium">{centro.nombre}</span>
                    {!centro.active ? (
                      <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] text-muted-foreground">Inactivo</span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {centro._count.repartos} líneas
                    </span>
                  </summary>
                  {centro.descripcion ? (
                    <p className="mt-2 text-xs text-muted-foreground">{centro.descripcion}</p>
                  ) : null}
                  {writable ? (
                    <div className="mt-3">
                      <EditarCentro
                        id={centro.id}
                        datos={{ codigo: centro.codigo, nombre: centro.nombre, descripcion: centro.descripcion, active: centro.active }}
                        action={updateCentroCosto.bind(null, centro.id)}
                      />
                    </div>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
