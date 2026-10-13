"use client";

import { useActionState, useEffect, useRef } from "react";

import type { CatalogFormState } from "@/app/actions/catalogs";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { categoryKindLabel } from "@/lib/labels";
import { controlClass, secondaryButtonClass } from "@/lib/ui";
import { categoryKindValues } from "@/lib/validation";

import type { CategoryKind } from "@/generated/prisma/client";

type CreateAction = (prev: CatalogFormState, formData: FormData) => Promise<CatalogFormState>;
type UpdateAction = (
  id: string,
  prev: CatalogFormState,
  formData: FormData,
) => Promise<CatalogFormState>;

type CatalogItem = {
  id: string;
  name: string;
  active: boolean;
  kind?: CategoryKind;
};

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p role="alert" aria-live="polite" className="text-xs text-danger">
      {message}
    </p>
  );
}

function KindSelect({
  name,
  defaultValue,
  id,
}: {
  name: string;
  defaultValue: string;
  id: string;
}) {
  return (
    <SelectDropdown
      id={id}
      name={name}
      value={defaultValue}
      allowEmpty={false}
      className="sm:w-44"
      options={categoryKindValues.map((value) => ({ value, label: categoryKindLabel(value) }))}
    />
  );
}

export function CatalogCreateForm({
  action,
  withKind,
  placeholder,
  idPrefix,
}: {
  action: CreateAction;
  withKind?: boolean;
  placeholder: string;
  idPrefix: string;
}) {
  const [state, formAction] = useActionState<CatalogFormState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <label htmlFor={`${idPrefix}-name`} className="sr-only">
            {placeholder}
          </label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            required
            maxLength={80}
            placeholder={placeholder}
            className={controlClass}
          />
        </div>
        {withKind ? (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-kind`} className="sr-only">
              Tipo
            </label>
            <KindSelect id={`${idPrefix}-kind`} name="kind" defaultValue="EXPENSE" />
          </div>
        ) : null}
        <SubmitButton pendingLabel="Agregando..." className={secondaryButtonClass}>
          Agregar
        </SubmitButton>
      </div>
      <ErrorMessage message={state?.error} />
    </form>
  );
}

export function CatalogRow({
  item,
  action,
  withKind,
  readOnly,
}: {
  item: CatalogItem;
  action: UpdateAction;
  withKind?: boolean;
  readOnly?: boolean;
}) {
  const boundAction = action.bind(null, item.id);
  const [state, formAction] = useActionState<CatalogFormState, FormData>(boundAction, undefined);

  if (readOnly) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
        <span className={item.active ? "" : "text-muted-foreground line-through"}>{item.name}</span>
        {withKind && item.kind ? (
          <span className="text-xs text-muted-foreground">{categoryKindLabel(item.kind)}</span>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1 border-b border-border py-2 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${item.id}-name`} className="sr-only">
          Nombre
        </label>
        <input
          id={`${item.id}-name`}
          name="name"
          required
          maxLength={80}
          defaultValue={item.name}
          className={controlClass + " min-w-[10rem] flex-1"}
        />
        {withKind ? (
          <>
            <label htmlFor={`${item.id}-kind`} className="sr-only">
              Tipo
            </label>
            <KindSelect id={`${item.id}-kind`} name="kind" defaultValue={item.kind ?? "EXPENSE"} />
          </>
        ) : null}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="active"
            defaultChecked={item.active}
            className="h-4 w-4 rounded border-border"
          />
          Activa
        </label>
        <SubmitButton pendingLabel="Guardando..." className={secondaryButtonClass}>
          Guardar
        </SubmitButton>
      </div>
      <ErrorMessage message={state?.error} />
    </form>
  );
}
