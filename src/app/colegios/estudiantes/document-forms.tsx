"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  deleteStudentDocument,
  revokeConsent,
  saveConsent,
  uploadStudentDocument,
  type DocumentFormState,
} from "@/app/actions/school-documents";
import { SubmitButton } from "@/components/submit-button";
import { controlClass, fieldClass, labelClass } from "@/lib/ui";

const TIPOS_DOCUMENTO = [
  { value: "CERTIFICADO_NACIMIENTO", label: "Certificado de nacimiento" },
  { value: "CERTIFICADO_ESTUDIOS", label: "Certificado de estudios" },
  { value: "FICHA_MEDICA", label: "Ficha médica" },
  { value: "CUSTODIA", label: "Documento de custodia" },
  { value: "OTRO", label: "Otro" },
] as const;

const ETIQUETA_TIPO: Record<string, string> = {
  CERTIFICADO_NACIMIENTO: "Certificado de nacimiento",
  CERTIFICADO_ESTUDIOS: "Certificado de estudios",
  FICHA_MEDICA: "Ficha médica",
  CUSTODIA: "Custodia",
  OTRO: "Otro",
};

type Documento = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  fileName: string;
  sizeBytes: number;
  creado: string;
};

/** Documentos del expediente: el certificado de nacimiento, el de estudios… */
export function DocumentForm({
  studentId,
  documentos,
  puedeEditar,
}: {
  studentId: string;
  documentos: Documento[];
  puedeEditar: boolean;
}) {
  const [state, action] = useActionState<DocumentFormState, FormData>(
    uploadStudentDocument,
    undefined,
  );
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Documento subido");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-border">
        {documentos.length === 0 ? (
          <li className="py-2 text-sm text-muted-foreground">
            Este alumno no tiene documentos en su expediente.
          </li>
        ) : (
          documentos.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{d.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {ETIQUETA_TIPO[d.type] ?? d.type} · {(d.sizeBytes / 1024).toFixed(0)} KB ·{" "}
                  {d.creado}
                </span>
                {d.description ? (
                  <span className="block text-xs text-muted-foreground">{d.description}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-3">
                <a
                  href={`/colegios/estudiantes/${studentId}/documentos/${d.id}/descarga`}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  Descargar
                </a>
                {puedeEditar ? (
                  <DeleteDocumentButton studentId={studentId} documentId={d.id} titulo={d.title} />
                ) : null}
              </span>
            </li>
          ))
        )}
      </ul>

      {puedeEditar ? (
        <details ref={panel} className="w-full max-w-md">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            Subir documento
          </summary>

          <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="studentId" value={studentId} />

            <div className={fieldClass}>
              <label htmlFor={`docTitle-${studentId}`} className={labelClass}>
                Título
              </label>
              <input
                id={`docTitle-${studentId}`}
                name="title"
                type="text"
                required
                placeholder="Certificado de nacimiento"
                className={controlClass}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor={`docType-${studentId}`} className={labelClass}>
                Tipo
              </label>
              <select
                id={`docType-${studentId}`}
                name="type"
                defaultValue="CERTIFICADO_NACIMIENTO"
                className={controlClass}
              >
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={fieldClass}>
              <label htmlFor={`docDescription-${studentId}`} className={labelClass}>
                Observación
              </label>
              <input
                id={`docDescription-${studentId}`}
                name="description"
                type="text"
                className={controlClass}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor={`docFile-${studentId}`} className={labelClass}>
                Archivo
              </label>
              <input
                id={`docFile-${studentId}`}
                name="file"
                type="file"
                required
                className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
              <p className="text-xs text-muted-foreground">Hasta 5 MB.</p>
            </div>

            {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

            <SubmitButton
              className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
              pendingLabel="Subiendo..."
            >
              Subir
            </SubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}

function DeleteDocumentButton({
  studentId,
  documentId,
  titulo,
}: {
  studentId: string;
  documentId: string;
  titulo: string;
}) {
  const [state, action] = useActionState<DocumentFormState, FormData>(
    deleteStudentDocument,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success(`Se eliminó «${titulo}»`);
  }, [state, titulo]);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <form action={action} className="inline">
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="studentId" value={studentId} />
        <button
          type="submit"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-danger"
        >
          Eliminar
        </button>
      </form>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </span>
  );
}

const ETIQUETA_FIN: Record<string, string> = {
  DATOS_PERSONALES: "Datos personales",
  FOTOGRAFIAS: "Fotografías y videos",
  SALUD: "Datos de salud",
  ACTIVIDADES: "Actividades extraescolares",
  VIAJES: "Viajes y traslados",
};

type Consentimiento = {
  id: string;
  purpose: string;
  status: string;
  grantedAt: string | null;
  grantedBy: string | null;
  method: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
};

/**
 * Consentimientos del alumno.
 *
 * La Ley 21.719 exige que el consentimiento sea específico (para qué se usa el
 * dato), que quede registro de quién lo firmó, y que se pueda revocar.
 */
export function ConsentForms({
  studentId,
  consentimientos,
  puedeEditar,
}: {
  studentId: string;
  consentimientos: Consentimiento[];
  puedeEditar: boolean;
}) {
  const [state, action] = useActionState<DocumentFormState, FormData>(saveConsent, undefined);
  const panel = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success("Consentimiento registrado");
    if (panel.current) panel.current.open = false;
    form.current?.reset();
  }, [state]);

  const porPurpose = new Map(consentimientos.map((c) => [c.purpose, c]));

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-border">
        {Object.keys(ETIQUETA_FIN).map((purpose) => {
          const c = porPurpose.get(purpose);
          const estado = c?.status ?? "PENDIENTE";
          return (
            <li key={purpose} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-sm">
                <span className="font-medium">{ETIQUETA_FIN[purpose]}</span>
                {c?.grantedAt ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    firmado el {c.grantedAt}
                    {c.grantedBy ? ` por ${c.grantedBy}` : ""}
                    {c.method ? ` (${c.method.toLowerCase()})` : ""}
                  </span>
                ) : null}
                {c?.revokedAt ? (
                  <span className="block text-xs text-danger">
                    revocado el {c.revokedAt}
                    {c.revokedReason ? `: ${c.revokedReason}` : ""}
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-3">
                <span
                  className={
                    "text-xs font-medium " +
                    (estado === "OTORGADO"
                      ? "text-success"
                      : estado === "REVOCADO"
                        ? "text-danger"
                        : "text-muted-foreground")
                  }
                >
                  {estado === "OTORGADO"
                    ? "Otorgado"
                    : estado === "REVOCADO"
                      ? "Revocado"
                      : "Pendiente"}
                </span>
                {puedeEditar && estado === "OTORGADO" ? (
                  <RevokeConsentButton
                    studentId={studentId}
                    consentId={c!.id}
                    fin={ETIQUETA_FIN[purpose]}
                  />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {puedeEditar ? (
        <details ref={panel} className="w-full max-w-md">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            Registrar consentimiento
          </summary>

          <form ref={form} action={action} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="studentId" value={studentId} />

            <div className={fieldClass}>
              <label htmlFor={`consentPurpose-${studentId}`} className={labelClass}>
                Para qué
              </label>
              <select
                id={`consentPurpose-${studentId}`}
                name="purpose"
                className={controlClass}
                defaultValue=""
              >
                <option value="">Elige…</option>
                {Object.entries(ETIQUETA_FIN).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div className={fieldClass}>
              <label htmlFor={`consentBy-${studentId}`} className={labelClass}>
                Quién lo firmó
              </label>
              <input
                id={`consentBy-${studentId}`}
                name="grantedBy"
                type="text"
                placeholder="Nombre del apoderado"
                className={controlClass}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor={`consentMethod-${studentId}`} className={labelClass}>
                Cómo
              </label>
              <select
                id={`consentMethod-${studentId}`}
                name="method"
                className={controlClass}
                defaultValue="PRESENCIAL"
              >
                <option value="PRESENCIAL">Presencial (firma en el colegio)</option>
                <option value="DIGITAL">Digital (correo o formulario con firma)</option>
                <option value="TESTIMONIO">Testimonio del apoderado</option>
              </select>
            </div>

            {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

            <SubmitButton
              className="self-start rounded-control border border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-primary"
              pendingLabel="Guardando..."
            >
              Registrar
            </SubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}

function RevokeConsentButton({
  studentId,
  consentId,
  fin,
}: {
  studentId: string;
  consentId: string;
  fin: string;
}) {
  const [state, action] = useActionState<DocumentFormState, FormData>(revokeConsent, undefined);
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (state?.ok) toast.success(`Consentimiento revocado: ${fin}`);
  }, [state, fin]);

  return (
    <details ref={panel} className="inline">
      <summary className="cursor-pointer text-xs text-muted-foreground underline underline-offset-2 hover:text-danger">
        Revocar
      </summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-control border border-border p-3">
        <input type="hidden" name="consentId" value={consentId} />
        <input type="hidden" name="studentId" value={studentId} />
        <label htmlFor={`revokeReason-${consentId}`} className="text-xs font-medium">
          Motivo
        </label>
        <input
          id={`revokeReason-${consentId}`}
          name="reason"
          type="text"
          className={controlClass}
        />
        {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
        <SubmitButton
          className="self-start rounded-control border border-danger bg-transparent px-2 py-1 text-xs font-semibold text-danger"
          pendingLabel="Guardando..."
        >
          Revocar
        </SubmitButton>
      </form>
    </details>
  );
}
