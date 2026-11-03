"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { saveAttendance, type AttendanceFormState } from "@/app/actions/schools";
import { useOnline } from "@/components/connection-status";
import {
  saveOfflineAttendance,
  countPendingOfflineAttendance,
} from "@/lib/offline-attendance";
import { sincronizarPendientes } from "@/lib/offline-attendance-sync";

type Alumno = { id: string; nombre: string; estadoInicial: string };

const ESTADOS = [
  { value: "PRESENT", label: "Presente", abbr: "P", tone: "success" },
  { value: "ABSENT", label: "Ausente", abbr: "A", tone: "danger" },
  { value: "LATE", label: "Atraso", abbr: "T", tone: "accent" },
  { value: "JUSTIFIED", label: "Justificada", abbr: "J", tone: "muted-foreground" },
] as const;

const TONE_CLASS: Record<string, string> = {
  success: "border-success bg-success-soft text-success",
  danger: "border-danger bg-danger-soft text-danger",
  accent: "border-accent bg-accent-soft text-accent",
  "muted-foreground": "border-border bg-background text-muted-foreground",
};

export function AttendanceMobile({
  sessionId,
  courseName,
  subjectName,
  date,
  alumnos,
}: {
  sessionId: string;
  courseName: string;
  subjectName: string;
  date: Date;
  alumnos: Alumno[];
}) {
  const [state, action, isPending] = useActionState<AttendanceFormState, FormData>(
    saveAttendance,
    undefined,
  );
  const form = useRef<HTMLFormElement>(null);

  // Estado local: estudiante -> estado seleccionado
  const [estados, setEstados] = useState<Map<string, string>>(() =>
    new Map(alumnos.map((a) => [a.id, a.estadoInicial])),
  );

  // La conexión llega del hook compartido (useSyncExternalStore): el servidor
  // siempre pinta "conectado" y ahí no hay hydration rota, a diferencia de
  // leer `navigator.onLine` en el estado inicial.
  const online = useOnline();
  const [pendientes, setPendientes] = useState<number>(0);
  const sincronizando = useRef(false);

  const refrescarPendientes = () => {
    countPendingOfflineAttendance().then(setPendientes).catch(() => {});
  };

  useEffect(() => {
    refrescarPendientes();
  }, []);

  // Auto-sync: al recuperar conexión la cola manda sola (lo que promete la UI).
  // Un solo corrido a la vez: la cola puede tener varios registros.
  useEffect(() => {
    if (!online) return;
    const correr = async () => {
      if (sincronizando.current) return;
      sincronizando.current = true;
      try {
        const antes = await countPendingOfflineAttendance();
        if (antes === 0) return;
        const { exitosas, fallidas } = await sincronizarPendientes();
        setPendientes(await countPendingOfflineAttendance());
        if (exitosas > 0) {
          toast.success(
            `Sincronizadas ${exitosas} asistencia${exitosas !== 1 ? "s" : ""} guardada${exitosas !== 1 ? "s" : ""} sin conexión.`,
          );
        }
        if (fallidas > 0) {
          toast.error(
            `${fallidas} de ${antes} asistencias no se pudieron sincronizar; revisa en Sincronizar asistencia.`,
          );
        }
      } finally {
        sincronizando.current = false;
      }
    };
    void correr();
  }, [online]);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Asistencia guardada");
      // Recargar pendientes tras guardar exitoso
      countPendingOfflineAttendance().then(setPendientes).catch(() => {});
    }
  }, [state]);

  const setEstado = (studentId: string, valor: string) => {
    setEstados((prev: Map<string, string>) => {
      const next = new Map(prev);
      next.set(studentId, valor);
      return next;
    });
  };

  const todosPresentes = () => {
    setEstados(new Map(alumnos.map((a) => [a.id, "PRESENT"])));
  };

  const todosAusentes = () => {
    setEstados(new Map(alumnos.map((a) => [a.id, "ABSENT"])));
  };

  const guardar = async () => {
    const listaAlumnos = alumnos.map((a) => ({
      studentId: a.id,
      estado: estados.get(a.id) ?? "PRESENT",
      justificacion: "",
    }));

    if (online) {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      listaAlumnos.forEach((a) => {
        formData.append("studentId", a.studentId);
        formData.append("estado", a.estado);
        formData.append("justificacion", a.justificacion);
      });
      action(formData);
    } else {
      // Sin conexión: guardar localmente y sincronizar al volver
      try {
        await saveOfflineAttendance({ sessionId, alumnos: listaAlumnos });
        const n = await countPendingOfflineAttendance();
        setPendientes(n);
        toast.success("Guardado sin conexión. Se sincronizará al recuperar internet.");
      } catch {
        toast.error("No se pudo guardar localmente.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">
          {courseName} · {subjectName}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {date.toLocaleDateString("es-CL", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>

      {/* Indicador de conexión y pendientes */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-control text-xs font-medium border ${
          online
            ? "border-border bg-surface text-muted-foreground"
            : "border-warning bg-warning-soft text-warning"
        }`}
      >
        {online ? (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Conectado
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Sin conexión
          </span>
        )}
        {pendientes > 0 ? (
          <Link
            href="/colegios/asistencia/sincronizar"
            className="ml-auto rounded-full bg-danger px-2 py-0.5 text-danger-foreground"
          >
            {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
          </Link>
        ) : null}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={todosPresentes}
          className="flex-1 rounded-control border border-success bg-success-soft px-3 py-2 text-xs font-semibold text-success"
        >
          Todos presentes
        </button>
        <button
          onClick={todosAusentes}
          className="flex-1 rounded-control border border-danger bg-danger-soft px-3 py-2 text-xs font-semibold text-danger"
        >
          Todos ausentes
        </button>
      </div>

      <form ref={form} onSubmit={(e) => { e.preventDefault(); guardar(); }} className="space-y-1">
        <input type="hidden" name="sessionId" value={sessionId} />
        {alumnos.map((a) => {
          const actual = estados.get(a.id) ?? "PRESENT";
          return (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 p-2 rounded-control border border-border bg-surface"
            >
              <span className="text-sm font-medium truncate">{a.nombre}</span>
              <div className="flex gap-0.5">
                {ESTADOS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEstado(a.id, e.value)}
                    className={`flex-1 rounded-control border px-1.5 py-1.5 text-xs font-medium uppercase tracking-tighter ${
                      actual === e.value
                        ? `bg-primary text-primary-foreground border-primary`
                        : `${TONE_CLASS[e.tone]}`
                    }`}
                  >
                    {e.abbr}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-control border border-primary bg-transparent px-4 py-3 text-sm font-semibold text-primary"
        >
          {isPending ? "Guardando..." : online ? "Guardar asistencia" : "Guardar (sin conexión)"}
        </button>
        {state?.error ? (
          <p className="mt-2 text-sm text-danger">{state.error}</p>
        ) : null}
      </form>
    </div>
  );
}
