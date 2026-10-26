"use client";

import { useActionState, useState } from "react";

import { upsertPosCaf, deletePosCafAction } from "@/app/actions/pos-sii-caf";
import { SubmitButton } from "@/components/submit-button";
import { cardClass, controlClass, dangerButtonClass, fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const TIPO_DTE_LABELS: Record<number, string> = {
  33: "Factura Electrónica (33)",
  39: "Boleta Electrónica (39)",
  61: "Nota de Crédito Electrónica (61)",
  56: "Nota de Débito Electrónica (56)",
};

type Config = {
  cafs: Array<{
    id: string;
    tipoDte: number;
    folioInicio: number;
    folioFinal: number;
    folioActual: number;
    vigenteDesde: Date | string;
    vigenteHasta: Date | string;
  }>;
} | null;

type CafState = { error?: string } | undefined;

export function PosSiiCafForm({ config }: { config: Config }) {
  const [state, formAction] = useActionState(upsertPosCaf, { error: undefined } as { error?: string });
  const [deleteState] = useActionState(deletePosCafAction, undefined);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tipoDte: 39,
    folioInicio: 1,
    folioFinal: 100,
    vigenteDesde: new Date().toISOString().slice(0, 10),
    vigenteHasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  const cafs = config?.cafs ?? [];

  function startEdit(caf: typeof cafs[0]) {
    setEditingId(caf.id);
    setFormData({
      tipoDte: caf.tipoDte,
      folioInicio: caf.folioInicio,
      folioFinal: caf.folioFinal,
      vigenteDesde: new Date(caf.vigenteDesde).toISOString().slice(0, 10),
      vigenteHasta: new Date(caf.vigenteHasta).toISOString().slice(0, 10),
    });
    setShowForm(true);
  }

  function startCreate() {
    setEditingId(null);
    setFormData({
      tipoDte: 39,
      folioInicio: 1,
      folioFinal: 100,
      vigenteDesde: new Date().toISOString().slice(0, 10),
      vigenteHasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    setShowForm(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      tipoDte: 39,
      folioInicio: 1,
      folioFinal: 100,
      vigenteDesde: new Date().toISOString().slice(0, 10),
      vigenteHasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    formAction(fd);
  }

  function handleDelete(cafId: string) {
    const fd = new FormData();
    fd.append("cafId", cafId);
    fetch("/api/pos/sii/caf", {
      method: "DELETE",
      body: JSON.stringify({ cafId }),
      headers: { "Content-Type": "application/json" },
    });
  }

  const availableTypes = [39, 33, 61, 56];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">CAFs (Códigos de Autorización de Folios)</h2>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className={primaryButtonClass + " text-xs px-3 py-1"}
          >
            Nuevo CAF
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="configId" value="" />
          <input type="hidden" name="cafId" value={editingId ?? ""} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="caf-tipo" className={labelClass}>
                Tipo de DTE
              </label>
              <select
                id="caf-tipo"
                name="tipoDte"
                value={formData.tipoDte}
                onChange={(e) => setFormData({ ...formData, tipoDte: Number(e.target.value) })}
                className={controlClass}
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_DTE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="caf-inicio" className={labelClass}>
                Folio inicial
              </label>
              <input
                id="caf-inicio"
                name="folioInicio"
                type="number"
                min="1"
                step="1"
                value={formData.folioInicio}
                onChange={(e) => setFormData({ ...formData, folioInicio: Number(e.target.value) || 0 })}
                className={controlClass + " tabular text-right"}
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor="caf-final" className={labelClass}>
                Folio final
              </label>
              <input
                id="caf-final"
                name="folioFinal"
                type="number"
                min="1"
                step="1"
                value={formData.folioFinal}
                onChange={(e) => setFormData({ ...formData, folioFinal: Number(e.target.value) || 0 })}
                className={controlClass + " tabular text-right"}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="caf-desde" className={labelClass}>
                Vigente desde
              </label>
              <input
                id="caf-desde"
                name="vigenteDesde"
                type="date"
                value={formData.vigenteDesde}
                onChange={(e) => setFormData({ ...formData, vigenteDesde: e.target.value })}
                className={controlClass}
                required
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor="caf-hasta" className={labelClass}>
                Vigente hasta
              </label>
              <input
                id="caf-hasta"
                name="vigenteHasta"
                type="date"
                value={formData.vigenteHasta}
                onChange={(e) => setFormData({ ...formData, vigenteHasta: e.target.value })}
                className={controlClass}
                required
              />
            </div>
          </div>

          {state?.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className={secondaryButtonClass}
            >
              Cancelar
            </button>
            <SubmitButton
              pendingLabel={editingId ? "Actualizando…" : "Guardando…"}
              className={primaryButtonClass}
            >
              {editingId ? "Actualizar CAF" : "Crear CAF"}
            </SubmitButton>
          </div>
        </form>
      ) : (
        <div className={cardClass + " overflow-x-auto"}>
          {cafs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium">No hay CAFs registrados.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea un CAF para cada tipo de documento que vas a emitir (Boleta 39, Factura 33, etc.).
              </p>
              <button
                type="button"
                onClick={startCreate}
                className={primaryButtonClass + " mt-3 px-3 py-1.5 text-xs"}
              >
                Crear primer CAF
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2 text-right">Desde</th>
                  <th className="px-4 py-2 text-right">Hasta</th>
                  <th className="px-4 py-2 text-right">Actual</th>
                  <th className="px-4 py-2 text-right">Disponibles</th>
                  <th className="px-4 py-2">Vigencia</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cafs.map((caf) => {
                  const disponibles = caf.folioFinal - caf.folioActual;
                  const hoy = new Date();
                  const desde = new Date(caf.vigenteDesde);
                  const hasta = new Date(caf.vigenteHasta);
                  const vencido = hoy > hasta;
                  const porVencer = !vencido && (hasta.getTime() - hoy.getTime()) < 30 * 24 * 60 * 60 * 1000;

                  return (
                    <tr key={caf.id} className={vencido ? "opacity-60" : ""}>
                      <td className="px-4 py-2 font-medium">{TIPO_DTE_LABELS[caf.tipoDte]}</td>
                      <td className="tabular px-4 py-2 text-right">{caf.folioInicio.toLocaleString("es-CL")}</td>
                      <td className="tabular px-4 py-2 text-right">{caf.folioFinal.toLocaleString("es-CL")}</td>
                      <td className="tabular px-4 py-2 text-right">{caf.folioActual.toLocaleString("es-CL")}</td>
                      <td className="tabular px-4 py-2 text-right">
                        <span className={disponibles <= 10 ? "text-danger" : "text-foreground"}>
                          {disponibles.toLocaleString("es-CL")}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(caf.vigenteDesde).toLocaleDateString("es-CL")} – {new Date(caf.vigenteHasta).toLocaleDateString("es-CL")}
                        {vencido ? " (vencido)" : porVencer ? " (por vencer)" : ""}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(caf)}
                          className="text-primary hover:underline text-xs"
                        >
                          Editar
                        </button>
                        <form onSubmit={(e) => { e.preventDefault(); handleDelete(caf.id); }} className="inline">
                          <button
                            type="submit"
                            className="text-danger hover:underline text-xs ml-2"
                          >
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}