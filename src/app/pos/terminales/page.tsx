"use server";

import Link from "next/link";

import { FormattedDate } from "@/components/formatted-date";
import { TerminalDeleteButton } from "@/app/pos/terminales/terminal-delete-button";
import { requireContext } from "@/lib/auth";
import { listPosTerminals } from "@/lib/pos";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { createPosTerminal, updatePosTerminal } from "@/app/actions/pos";

export default async function PosTerminalesPage() {
  const ctx = await requireContext();
  const terminals = await listPosTerminals(ctx.company.id);

  async function onCreate(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await createPosTerminal({ name });
  }

  async function onUpdate(id: string, formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const active = formData.get("active") === "on";
    await updatePosTerminal({ id, name, active });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terminales del POS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona los puntos de venta físicos desde los que se opera cada caja.
          </p>
        </div>
        <Link href="/pos/caja" className={secondaryButtonClass}>
          Volver a caja
        </Link>
      </div>

      <section className={cardClass + " p-5"}>
        <h2 className="text-sm font-semibold mb-4">Nueva terminal</h2>
        <form action={onCreate} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="pos-terminal-name" className="text-xs font-medium text-muted-foreground">
              Nombre
            </label>
            <input
              id="pos-terminal-name"
              name="name"
              type="text"
              maxLength={100}
              placeholder="Ej. Caja 1, Mostrador, Delivery"
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              required
            />
          </div>
          <button type="submit" className={primaryButtonClass}>
            Crear terminal
          </button>
        </form>
      </section>

      <section className={cardClass + " p-5"}>
        <h2 className="text-sm font-semibold mb-4">Terminales registradas</h2>
        {terminals.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No hay terminales registradas. Crea una para poder asignarla al abrir una caja.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Cajas usadas</th>
                  <th className="px-4 py-2">Creada</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {terminals.map((terminal) => (
                  <tr key={terminal.id} className="tabular">
                    <td className="px-4 py-2 font-medium">{terminal.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          terminal.active
                            ? "bg-success-soft text-success"
                            : "bg-muted-soft text-muted-foreground"
                        }`}
                      >
                        {terminal.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{terminal._count.sessions}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      <FormattedDate iso={terminal.createdAt.toISOString()} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form
                        action={(fd: FormData) => onUpdate(terminal.id, fd)}
                        className="flex items-center gap-2"
                      >
                        <input
                          name="name"
                          defaultValue={terminal.name}
                          className="rounded-control border border-border px-2 py-1 text-sm"
                          required
                        />
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            name="active"
                            type="checkbox"
                            defaultChecked={terminal.active}
                            className="rounded border-border bg-surface text-primary focus:ring-primary"
                          />
                          {terminal.active ? "Activa" : "Inactiva"}
                        </label>
                        <button
                          type="submit"
                          className="rounded-control border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-background"
                        >
                          Guardar
                        </button>
                        <TerminalDeleteButton
                          terminalId={terminal.id}
                          terminalName={terminal.name}
                        />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Las terminales inactivas siguen apareciendo en el historial de las cajas que se abrieron en
        ellas, pero no se pueden seleccionar al abrir una caja nueva.
      </p>
    </div>
  );
}
