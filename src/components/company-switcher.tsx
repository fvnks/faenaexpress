"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { switchCompany } from "@/app/actions/companies";

const iconCls = "h-4 w-4 shrink-0";

function ChevronsUpDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 opacity-60" aria-hidden="true">
      <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary shrink-0" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 o 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * Dropdown de empresas con patrón workspace switcher.
 * Solo se muestra cuando el usuario puede ver más de una empresa (es decir, tiene
 * el permiso `canSwitchCompanies` de su organización). El botón muestra la empresa
 * activa y el menú permite cambiar entre ellas.
 */
export function CompanySwitcher({
  companies,
  activeId,
  orgName,
}: {
  companies: { id: string; name: string }[];
  activeId: string | null;
  /** Nombre de la organización (cabecera del dropdown). */
  orgName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const active = companies.find((c) => c.id === activeId) ?? companies[0];

  /**
   * Cambia de empresa llamando la server action de forma imperativa.
   * Evita el patrón form + setOpen(false) en el click: desmontar el
   * formulario durante el envío puede cancelar la acción.
   */
  const switchTo = (companyId: string) => {
    setOpen(false);
    const data = new FormData();
    data.set("companyId", companyId);
    startTransition(async () => {
      await switchCompany(data);
    });
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Sin empresas visibles no hay switcher.
  if (companies.length === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-busy={pending}
        onClick={() => setOpen((v) => !v)}
        className={"flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-background" + (pending ? " opacity-60" : "")}
      >
        <BuildingIcon />
        <span className="max-w-[9rem] truncate font-medium text-foreground">
          {active?.name}
        </span>
        <ChevronsUpDown />
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-56 rounded-card border border-border bg-surface p-1 shadow-lg">
          {orgName ? (
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {orgName}
            </div>
          ) : null}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Empresas
          </div>
          <ul className="flex flex-col">
            {companies.map((company) => {
              const isActive = company.id === activeId;
              return (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => switchTo(company.id)}
                    className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background"
                  >
                    <BuildingIcon />
                    <span className="flex-1 truncate font-medium text-foreground">
                      {company.name}
                    </span>
                    {isActive ? <CheckIcon /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mx-1 my-1 border-t border-border" />
          <ul className="flex flex-col">
            <li>
              <Link
                href="/dashboard/configuracion"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-control px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <PlusIcon />
                Nueva empresa
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/configuracion"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-control px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <SettingsIcon />
                Gestionar empresas
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
