"use client";

import { useTransition } from "react";

import { deletePosTerminal } from "@/app/actions/pos";

/**
 * Botón para desactivar una terminal POS.
 * Se renderiza desde el cliente para no adjuntar un `onClick` directamente en
 * el JSX de un componente de servidor (evita el error de hidratación React #441
 * descrito en CONTEXTO.md §12.11). Llama a la Server Action de forma imperativa
 * con `startTransition`, igual que hace `company-switcher`.
 */
export function TerminalDeleteButton({
  terminalId,
  terminalName,
}: {
  terminalId: string;
  terminalName: string;
}) {
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const mensaje =
      `¿Desactivar la terminal «${terminalName}»? No se borrará el historial de cajas, pero no se podrá abrir una caja nueva en ella.`;
    if (!confirm(mensaje)) return;
    startTransition(() => {
      deletePosTerminal({ id: terminalId });
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      className="rounded-control border border-border px-2 py-1 text-xs text-danger hover:bg-danger/5"
    >
      {isPending ? "Desactivando…" : "Desactivar"}
    </button>
  );
}
