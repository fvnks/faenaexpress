"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { subirFotoCubicacion } from "@/app/actions/obra-terreno";
import { SubmitButton } from "@/components/submit-button";
import { controlClass } from "@/lib/ui";

export function FotoCubicacion({ cubicacionId, fotos }: { cubicacionId: string; fotos: Array<{ id: string; fileName: string }> }) {
  const router = useRouter();
  const [state, action] = useActionState(subirFotoCubicacion, undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.ok) { toast.success("Foto guardada."); setOpen(false); router.refresh(); }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {fotos.map((f) => (
        <a key={f.id} href={`/obras/fotos/${f.id}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
          📷 {f.fileName}
        </a>
      ))}
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-muted-foreground hover:text-primary">
        + foto
      </button>
      {open ? (
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="cubicacionId" value={cubicacionId} />
          <input name="file" type="file" accept="image/*" required className={controlClass + " max-w-[220px]"} />
          <SubmitButton pendingLabel="…">Subir</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
