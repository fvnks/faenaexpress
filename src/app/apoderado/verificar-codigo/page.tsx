"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { verificarCodigoAcceso } from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Verificar código de acceso al portal.
 *
 * Cualquier apoderado puede entrar y escribir su código para saber si sigue
 * vigente: si el colegio lo rotó, el código anterior ya no sirve y hay que
 * pedir uno nuevo en la secretaría.
 */
export default function VerificarCodigoPage() {
  const [state, action] = useActionState<{ error?: string; ok?: boolean; codigo?: string; valido?: boolean }, FormData>(
    verificarCodigoAcceso,
    undefined,
  );

  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Portal del apoderado
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Verificar código de acceso
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escribe el código que te dio el colegio para saber si sigue
            vigente. Si lo rotaron, ya no sirve y necesitas uno nuevo.
          </p>
        </div>

        <form action={action} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">
              Código de acceso
            </label>
            <Input
              name="codigo"
              placeholder="Ej: A1B2C3D4"
              className="w-full"
            />
          </div>

          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          {state?.ok && state.valido === false ? (
            <div className="rounded-control border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">El código no es válido</p>
              <p className="mt-1 text-xs">
                Este código ya no está activo. Pide uno nuevo en la
                secretaría del colegio.
              </p>
            </div>
          ) : null}

          {state?.ok && state.valido === true && state.codigo ? (
            <div className="rounded-control border border-success bg-success/10 p-3 text-sm text-success">
              <p className="font-medium">El código es válido</p>
              <p className="mt-1 text-xs">
                Tu código de acceso{" "}
                <code className="font-mono bg-success/20 px-1 py-0.5 rounded">
                  {state.codigo}
                </code>
                está activo y puedes usarlo para entrar al portal.
              </p>
            </div>
          ) : null}

          <Button type="submit" className="w-full">
            Verificar código
          </Button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          ¿No tienes código? Pídelo en la secretaría de tu colegio. Ellos lo
            entregan en persona, en la reunión de apoderados o cuando lo necesites.
        </p>
      </main>
    </div>
  );
}
