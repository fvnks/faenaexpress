"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { linkNoteToDocument, unlinkNote } from "@/app/actions/sale-notes";

type Documento = { value: string; label: string };

/**
 * El documento que una nota de crédito/débito ajusta.
 *
 * Cuando la nota se trajo del SII y el documento relacionado ya estaba
 * importado, el vínculo viene hecho. Cuando no, se elige acá: las opciones son
 * las facturas y las guías del MISMO cliente de la nota, que es como tiene que
 * ser. Elegir "Sin relacionar" deshace el vínculo.
 */
export function NoteDocumentLink({
  noteId,
  related,
  facturas,
  guias,
  puedeEditar,
}: {
  noteId: string;
  /** El documento con el que ya está relacionada, si hay. */
  related: { tipo: "venta" | "guia"; id: string } | null;
  facturas: Documento[];
  guias: Documento[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const actual = related ? `${related.tipo}:${related.id}` : "";
  const [elegido, setElegido] = useState(actual);

  if (!puedeEditar) {
    return related ? (
      <span className="text-xs text-muted-foreground">Relacionada</span>
    ) : (
      <span className="text-xs text-muted-foreground">Sin documento</span>
    );
  }

  const [tipo, targetId] = elegido.split(":");
  const accion = elegido ? linkNoteToDocument : unlinkNote;

  return (
    <form
      action={accion}
      className="flex flex-wrap items-center gap-2"
      onSubmit={() => router.refresh()}
    >
      <input type="hidden" name="id" value={noteId} />
      <input type="hidden" name="tipo" value={tipo ?? ""} />
      <input type="hidden" name="targetId" value={targetId ?? ""} />
      <select
        value={elegido}
        onChange={(e) => setElegido(e.target.value)}
        aria-label="Documento que ajusta la nota"
        className="rounded-control border border-border bg-surface px-2 py-1 text-xs text-foreground"
      >
        <option value="">Sin relacionar</option>
        <optgroup label="Facturas">
          {facturas.map((v) => (
            <option key={v.value} value={`venta:${v.value}`}>
              {v.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Guías de despacho">
          {guias.map((g) => (
            <option key={g.value} value={`guia:${g.value}`}>
              {g.label}
            </option>
          ))}
        </optgroup>
      </select>
      <button
        type="submit"
        disabled={!elegido && !related}
        className="rounded-control border border-border bg-transparent px-2 py-1 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
      >
        {elegido ? "Relacionar" : "Quitar"}
      </button>
    </form>
  );
}
