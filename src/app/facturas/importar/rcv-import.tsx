"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  confirmRcvSync,
  previewRcvSync,
  siiAutoLoginAction,
  siiLoginAction,
  siiLogoutAction,
  type SiiLoginState,
} from "@/app/actions/sii";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { dteTipoLabel } from "@/lib/labels";
import { formatCLP, formatDate } from "@/lib/money";

function EstadoBadge({ estado }: { estado: string }) {
  switch (estado) {
    case "nueva":
      return <span className="inline-flex whitespace-nowrap rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Nueva</span>;
    case "duplicada":
      return <span className="inline-flex whitespace-nowrap rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Duplicada</span>;
    case "omitida":
      return <span className="inline-flex whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Omitida</span>;
    default:
      return <span className="inline-flex whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Error</span>;
  }
}

function SiiAutoLoginForm() {
  const [state, action] = useActionState<SiiLoginState, FormData>(siiAutoLoginAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Sesión del SII iniciada con las credenciales guardadas");
  }, [state]);

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-primary/40 bg-primary-soft px-4 py-3"
    >
      <SubmitButton
        pendingLabel="Iniciando sesión…"
        className="btn-liquid btn-liquid-primary rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
      >
        Iniciar sesión con credenciales guardadas
      </SubmitButton>
      <span className="text-xs text-muted-foreground">
        Usa el RUT y la Clave Tributaria guardados para esta empresa (guardados cifrados en
        Configuración). No hay que escribir nada.
      </span>
      {state?.error ? (
        <p role="alert" className="w-full text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function SiiLoginForm({
  defaultRut,
  hasStoredCredentials,
}: {
  defaultRut: string;
  hasStoredCredentials: boolean;
}) {
  const [state, action] = useActionState(siiLoginAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Sesión del SII iniciada");
  }, [state]);

  return (
    <form action={action} className="grid gap-3 rounded-card border border-border bg-background p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="sii-rut" className="text-sm font-medium">
          RUT de la cuenta
        </label>
        <input
          id="sii-rut"
          name="rut"
          required
          maxLength={12}
          defaultValue={defaultRut}
          placeholder="77.115.357-7"
          className="tabular w-full rounded-control border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="sii-clave" className="text-sm font-medium">
          Clave Tributaria
        </label>
        <input
          id="sii-clave"
          name="clave"
          type="password"
          required
          autoComplete="off"
          placeholder="••••••••"
          className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>
      <SubmitButton
        pendingLabel="Iniciando sesión…"
        className="btn-liquid btn-liquid-primary h-10 rounded-control border border-primary bg-transparent px-4 text-sm font-semibold text-primary"
      >
        Iniciar sesión
      </SubmitButton>
      <p className="text-xs text-muted-foreground sm:col-span-3">
        {hasStoredCredentials
          ? "Formulario manual: la Clave que escribas aquí se usa una sola vez para abrir la sesión y no se guarda ni se registra."
          : "Tu Clave se usa una sola vez para abrir la sesión contra el SII y se descarta: no se guarda ni se registra. Solo queda la sesión (cookies) en el servidor. Puedes guardar las credenciales en Configuración → Credenciales del SII."}
      </p>
      {state?.error ? (
        <p role="alert" className="text-sm text-danger sm:col-span-3">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function RcvImportForm({
  session,
  currentPeriod,
  companyRut,
  defaultSide = "COMPRA",
  hasStoredCredentials = false,
}: {
  session: { authenticated: boolean; rut: string | null };
  currentPeriod: string;
  companyRut: string | null;
  defaultSide?: string;
  hasStoredCredentials?: boolean;
}) {
  const [preview, previewAction] = useActionState(previewRcvSync, undefined);
  const [confirm, confirmAction] = useActionState(confirmRcvSync, undefined);
  const [filtroTipo, setFiltroTipo] = useState<number | "todos">("todos");

  const rows = preview?.rows ?? [];

  // Tipos presentes en el resultado, con conteo, para armar los botones de filtro.
  const tiposPresentes = new Map<number, { label: string; total: number; nuevas: number }>();
  for (const row of rows) {
    const entry = tiposPresentes.get(row.tipoDoc) ?? {
      label: row.tipoDocLabel,
      total: 0,
      nuevas: 0,
    };
    entry.total += 1;
    if (row.estado === "nueva") entry.nuevas += 1;
    tiposPresentes.set(row.tipoDoc, entry);
  }

  const rowsVisibles = filtroTipo === "todos" ? rows : rows.filter((row) => row.tipoDoc === filtroTipo);
  const nuevas = rowsVisibles.filter((row) => row.estado === "nueva");
  const payload = JSON.stringify(nuevas);

  useEffect(() => {
    if (confirm?.ok && confirm.imported) {
      toast.success(`Se importaron ${confirm.imported} ${confirm.imported === 1 ? "documentos" : "documentos"} del RCV`);
    }
  }, [confirm]);

  return (
    <div className="flex flex-col gap-4">
      {/* Estado de la sesión SII */}
      <div
        className={
          "flex flex-wrap items-center gap-2 rounded-control border px-3 py-2 text-sm " +
          (session.authenticated
            ? "border-success/40 bg-success-soft text-success"
            : "border-danger/40 bg-danger-soft text-danger")
        }
      >
        <span className={"h-2 w-2 rounded-full " + (session.authenticated ? "bg-success" : "bg-danger")} aria-hidden="true" />
        {session.authenticated ? (
          <>
            <span>
              Sesión SII activa para <strong>{companyRut}</strong>{" "}
              <span className="opacity-80">(RUT {session.rut})</span>
            </span>
            <form action={siiLogoutAction} className="ml-auto">
              <SubmitButton
                pendingLabel="Cerrando…"
                className="text-xs underline-offset-2 hover:underline"
              >
                Cerrar sesión
              </SubmitButton>
            </form>
          </>
        ) : (
          <span>
            Sin sesión del SII para <strong>{companyRut}</strong>.{" "}
            {hasStoredCredentials
              ? "Puedes iniciarla con un clic abajo, o usar el formulario manual."
              : "Inicia sesión abajo con el RUT y la Clave Tributaria de esta empresa."}
          </span>
        )}
      </div>

      {/* Login (solo sin sesión) */}
      {!session.authenticated ? (
        <div className="flex flex-col gap-3">
          {hasStoredCredentials ? <SiiAutoLoginForm /> : null}
          <SiiLoginForm
            defaultRut={companyRut ?? ""}
            hasStoredCredentials={hasStoredCredentials}
          />
        </div>
      ) : null}

      {/* Consulta */}
      <form action={previewAction} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-44 flex-1 flex-col gap-1">
          <label htmlFor="rcv-side" className="text-sm font-medium">
            Traer
          </label>
          <SelectDropdown
            id="rcv-side"
            name="side"
            value={defaultSide === "VENTA" ? "VENTA" : "COMPRA"}
            allowEmpty={false}
            options={[
              { value: "COMPRA", label: "Facturas de compra (proveedores)" },
              { value: "VENTA", label: "Facturas de venta (clientes)" },
            ]}
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-1">
          <label htmlFor="rcv-periodo" className="text-sm font-medium">
            Período del RCV
          </label>
          <input
            id="rcv-periodo"
            name="periodo"
            type="month"
            required
            defaultValue={currentPeriod}
            className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <SubmitButton
          pendingLabel="Consultando el SII…"
          className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-4 py-2 text-sm font-semibold text-foreground"
        >
          Consultar el SII
        </SubmitButton>
      </form>

      {preview?.error ? (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {preview.error}
        </p>
      ) : null}

      {preview?.advertencia ? (
        <p role="alert" className="rounded-control border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
          {preview.advertencia}
        </p>
      ) : null}

      {/* Vista previa */}
      {rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary">
              {preview?.resumen?.total ?? 0} en el RCV
            </span>
            <span className="rounded-full bg-success-soft px-2.5 py-1 font-medium text-success">
              {nuevas.length} nuevas
            </span>
            {preview?.resumen?.duplicadas ? (
              <span className="rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary">
                {preview.resumen.duplicadas} duplicadas
              </span>
            ) : null}
            {preview?.resumen?.omitidas ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
                {preview.resumen.omitidas} omitidas
              </span>
            ) : null}
            {preview?.resumen?.conError ? (
              <span className="rounded-full bg-danger-soft px-2.5 py-1 font-medium text-danger">
                {preview.resumen.conError} con error
              </span>
            ) : null}
          </div>

          {/* Filtros por tipo de documento: el usuario elige qué ver y qué importar. */}
          {tiposPresentes.size > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por tipo de documento">
              {[...tiposPresentes.entries()]
                .sort(([a], [b]) => a - b)
                .map(([tipo, info]) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setFiltroTipo(filtroTipo === tipo ? "todos" : tipo)}
                    aria-pressed={filtroTipo === tipo}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs transition-colors " +
                      (filtroTipo === tipo
                        ? "border-primary bg-primary-soft font-medium text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")
                    }
                  >
                    {info.label}{" "}
                    <span className="opacity-70">
                      ({info.nuevas}/{info.total})
                    </span>
                  </button>
                ))}
              {filtroTipo !== "todos" ? (
                <button
                  type="button"
                  onClick={() => setFiltroTipo("todos")}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ver todos
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Folio</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Tercero</th>
                  <th className="px-3 py-2 text-right font-medium">Neto</th>
                  <th className="px-3 py-2 text-right font-medium">IVA</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rowsVisibles.map((row) => (
                  <tr key={`${row.tipoDoc}-${row.folio}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 align-top">{dteTipoLabel(row.tipoDoc)}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top font-medium">{row.folio}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 align-top">{formatDate(new Date(row.fecha + "T00:00:00.000Z"))}</td>
                    <td className="max-w-[16rem] px-3 py-2 align-top">
                      <span className="block truncate font-medium">
                        {/* En una guía la empresa emite y el cliente recibe: el
                            tercero es el receptor, no el emisor. */}
                        {row.tipoDoc === 50
                          ? (row.receptorNombre ?? row.nombre)
                          : row.nombre}
                      </span>
                      {row.tipoDoc === 50 && row.documentoRelacionadoFolio ? (
                        <span className="block text-xs text-muted-foreground">
                          Despacha la factura N° {row.documentoRelacionadoFolio}
                        </span>
                      ) : null}
                      {row.mensaje ? (
                        <span className="block text-xs text-muted-foreground">{row.mensaje}</span>
                      ) : null}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top">{formatCLP(row.neto)}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top">{formatCLP(row.iva)}</td>
                    <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top font-semibold">{formatCLP(row.total)}</td>
                    <td className="px-3 py-2 align-top">
                      <EstadoBadge estado={row.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nuevas.length > 0 && !confirm?.ok ? (
            <form action={confirmAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="payload" value={payload} />
              <input type="hidden" name="side" value={preview?.side ?? "COMPRA"} />
              <input type="hidden" name="periodo" value={preview?.periodo ?? ""} />
              <SubmitButton
                pendingLabel="Importando…"
                className="btn-liquid btn-liquid-primary rounded-control border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary"
              >
                Importar {nuevas.length} {nuevas.length === 1 ? "documento" : "documentos"}
              </SubmitButton>
              <span className="text-xs text-muted-foreground">
                Quedan pendientes de pago/cobro; los montos son los oficiales del RCV.
              </span>
            </form>
          ) : null}
        </div>
      ) : null}

      {confirm?.ok && confirm.imported ? (
        <p role="status" className="rounded-control border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">
          Se importaron {confirm.imported} documentos del RCV ({preview?.side === "VENTA" ? "ventas" : "compras"}).
        </p>
      ) : null}

      {confirm?.errores?.length ? (
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          {confirm.errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      {confirm?.error ? (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {confirm.error}
        </p>
      ) : null}
    </div>
  );
}
