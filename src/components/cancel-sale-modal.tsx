"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getAvailableNotesForSale, type AvailableNote } from "@/app/actions/sii";
import { cancelSale } from "@/app/actions/sales";

type Props = {
  saleId: string;
  existingNoteNumber?: string | null;
  existingNoteType?: string | null;
  existingReason?: string | null;
};

export function CancelSaleModal({ saleId, existingNoteNumber, existingNoteType, existingReason }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteType, setNoteType] = useState<"CREDIT_NOTE" | "DEBIT_NOTE" | "REASON">(
    existingNoteType === "CREDIT_NOTE" || existingNoteType === "DEBIT_NOTE"
      ? existingNoteType
      : "CREDIT_NOTE",
  );
  const [selectedFolio, setSelectedFolio] = useState(existingNoteNumber ?? "");
  const [reason, setReason] = useState(existingReason ?? "");
  const [notes, setNotes] = useState<AvailableNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExistingNote = Boolean(existingNoteNumber);

  const loadNotes = () => {
    if (hasExistingNote) return;
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const result = await getAvailableNotesForSale(saleId);
      if (result.error) {
        setError(result.error);
      } else {
        setNotes(result.notes);
      }
      setLoading(false);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (noteType === "REASON" && !reason.trim()) {
      setError("Debes indicar la razón de la cancelación.");
      return;
    }

    if ((noteType === "CREDIT_NOTE" || noteType === "DEBIT_NOTE") && !selectedFolio) {
      setError("Debes seleccionar una nota de crédito o débito.");
      return;
    }

    const formData = new FormData();
    formData.set("saleId", saleId);
    formData.set("cancellationType", noteType);
    if (noteType === "REASON") {
      formData.set("cancellationReason", reason.trim());
    } else {
      formData.set("cancellationNoteNumber", selectedFolio);
    }

    startTransition(async () => {
      await cancelSale(formData);
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Anular venta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasExistingNote
            ? "Esta venta ya tiene una nota asociada. No se puede modificar."
            : "Selecciona el motivo de la anulación."}
        </p>

        {hasExistingNote ? (
          <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
            <p className="font-medium">
              {existingNoteType === "CREDIT_NOTE" ? "Nota de crédito" : "Nota de débito"} asociada
            </p>
            <p className="mt-1 text-muted-foreground">Folio: {existingNoteNumber}</p>
            {existingReason && <p className="mt-1 text-muted-foreground">Razón: {existingReason}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Tipo de cancelación</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNoteType("CREDIT_NOTE")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    noteType === "CREDIT_NOTE"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-transparent text-foreground hover:bg-muted"
                  }`}
                >
                  Nota de crédito
                </button>
                <button
                  type="button"
                  onClick={() => setNoteType("DEBIT_NOTE")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    noteType === "DEBIT_NOTE"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-transparent text-foreground hover:bg-muted"
                  }`}
                >
                  Nota de débito
                </button>
                <button
                  type="button"
                  onClick={() => setNoteType("REASON")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    noteType === "REASON"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-transparent text-foreground hover:bg-muted"
                  }`}
                >
                  Razón
                </button>
              </div>
            </div>

            {(noteType === "CREDIT_NOTE" || noteType === "DEBIT_NOTE") && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  {noteType === "CREDIT_NOTE" ? "Nota de crédito" : "Nota de débito"} <span className="text-destructive">*</span>
                </label>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Cargando notas disponibles…</p>
                ) : notes.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      No se encontraron {noteType === "CREDIT_NOTE" ? "notas de crédito" : "notas de débito"} para este cliente en el SII.
                    </p>
                    <button
                      type="button"
                      onClick={loadNotes}
                      className="text-sm text-primary hover:underline"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedFolio}
                    onChange={(e) => setSelectedFolio(e.target.value)}
                    className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {notes.map((note) => (
                      <option key={`${note.tipoDoc}-${note.folio}`} value={note.folio}>
                        {note.tipoDocLabel} {note.folio} — {note.fecha} — ${note.total.toLocaleString("es-CL")}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {noteType === "REASON" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Razón de la cancelación <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Ej: cliente canceló el pedido, error en la facturación…"
                  required
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || loading}
                className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isPending ? "Anulando…" : "Anular venta"}
              </button>
            </div>
          </form>
        )}

        {hasExistingNote && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
