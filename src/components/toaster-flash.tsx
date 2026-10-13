"use client";

import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";

import { clearFlash } from "@/app/actions/flash";
import type { Flash } from "@/lib/flash";

/**
 * Host de toasts (sonner) + consumo del mensaje flash que dejan las Server
 * Actions antes de redirigir. El id del flash evita mostrarlo dos veces si el
 * layout re-renderiza antes de que la cookie se borre.
 */
export function ToasterFlash({ flash }: { flash: Flash | null }) {
  const shownId = useRef<string | null>(null);

  useEffect(() => {
    if (!flash || flash.id === shownId.current) return;
    shownId.current = flash.id;
    if (flash.type === "error") {
      toast.error(flash.title, { description: flash.description });
    } else {
      toast.success(flash.title, { description: flash.description });
    }
    void clearFlash();
  }, [flash]);

  return <Toaster position="bottom-right" richColors closeButton />;
}
