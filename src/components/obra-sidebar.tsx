"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import { UserMenu } from "@/components/user-menu";
import type { ObraRole } from "@/generated/prisma/client";
import { canAccessObra, obraRoleLabel, type ObraSection } from "@/lib/obra-permissions";

const iconCls = "h-4 w-4 shrink-0";

/** Iconos funcionales (mismo trazo que el sidebar de Facturas). */
function Icon({ name }: { name: ObraSection | "panel" }) {
  const paths: Record<string, string> = {
    panel: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
    presupuesto: "M4 3h16v18H4zM8 7h8M8 11h8M8 15h4",
    avance: "M3 17l6-6 4 4 8-8M15 7h6v6",
    estadosPago: "M6 2h9l5 5v15H6zM15 2v5h5M9 13h7M9 17h7",
    compras: "M3 4h4l2.5 12h10l2-8H7M10 21a1 1 0 100-2 1 1 0 000 2zM18 21a1 1 0 100-2 1 1 0 000 2z",
    gastos: "M4 3v18l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 8h8M8 12h8",
    subcontratos: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    bodega: "M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9h18M9 21v-8h6v8",
    maquinaria: "M12 2v4M5 6l2 3M19 6l-2 3M4 12h16v6H4zM8 18v3M16 18v3M8 14h.01M12 14h.01M16 14h.01",
    documentos: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6",
    equipo: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    administracion: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <path d={paths[name] ?? paths.panel} />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx("h-3.5 w-3.5 shrink-0 transition-transform duration-200", open && "rotate-180")}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

type NavItem = { href: string; label: string; section: ObraSection; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Control de obra",
    items: [
      { href: "/obras/presupuesto", label: "Presupuesto", section: "presupuesto" },
      { href: "/obras/presupuesto/versiones", label: "Versiones del presupuesto", section: "presupuesto" },
      { href: "/obras/avance", label: "Avance", section: "avance" },
      { href: "/obras/estados-pago", label: "Estados de pago", section: "estadosPago" },
      { href: "/obras/reportes", label: "Reportes", section: "panel" },
    ],
  },
  {
    label: "Recursos",
    items: [
      { href: "/obras/compras", label: "Compras", section: "compras" },
      { href: "/obras/gastos", label: "Gastos", section: "gastos" },
      { href: "/obras/subcontratos", label: "Subcontratos", section: "subcontratos" },
      { href: "/obras/bodega", label: "Bodega", section: "bodega" },
      { href: "/obras/maquinaria", label: "Maquinaria", section: "maquinaria" },
    ],
  },
  {
    label: "Mandantes",
    items: [
      { href: "/obras/mandantes", label: "Mandantes", section: "panel" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/obras/mis-obras", label: "Mis obras", section: "panel" },
      { href: "/obras/plantillas", label: "Plantillas de itemizado", section: "presupuesto" },
      { href: "/obras/documentos", label: "Control documental", section: "documentos" },
      { href: "/obras/equipo", label: "Equipo", section: "equipo" },
      { href: "/obras/administracion", label: "Configuración", section: "administracion" },
    ],
  },
];

function rowClass(active: boolean) {
  return clsx(
    "flex items-center gap-3 rounded-control px-2 py-2 text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
    active
      ? "bg-primary-soft font-medium text-primary"
      : "text-muted-foreground hover:bg-background hover:text-foreground",
  );
}

/** Sidebar del módulo Obras: mismo lenguaje visual que el sidebar de Facturas. */
export function ObraSidebar({
  role,
  userName,
  userEmail,
  obraName,
  pendingEP,
  logout,
}: {
  role: ObraRole;
  userName: string;
  userEmail: string;
  /** Nombre de la obra activa, igual que el sidebar de Facturas muestra la empresa. */
  obraName: string;
  /** Estados de pago en borrador: aviso en el ítem y en el grupo. */
  pendingEP?: number;
  logout: () => void;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const needle = query.trim().toLowerCase();

  // Los grupos con la ruta activa arrancan abiertos; el resto cerrados.
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const group of GROUPS) {
      next[group.label] = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    }
    setOpenGroups(next);
  }, [pathname]);

  const visibleGroups = useMemo(
    () =>
      GROUPS.map((group) => ({
        group,
        items: group.items.filter(
          (item) => canAccessObra(role, item.section) && (!needle || item.label.toLowerCase().includes(needle)),
        ),
      })).filter((g) => g.items.length > 0),
    [role, needle],
  );

  useEffect(() => {
    if (mobileOpen) drawerRef.current?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName))) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const nav = (
    <nav aria-label="Secciones de la obra" className="flex h-full min-h-0 flex-col">
      {/* Marca + obra + buscador */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            </svg>
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">Obras</span>
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground" title={obraName}>
          {obraName}
        </p>
        <div className="relative mt-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            id="obra-sidebar-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar secciones…"
            className="h-9 w-full rounded-control border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>
      </div>

      {/*Ítems y grupos colapsables */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="mb-1">
          <li>
            <Link href="/obras" aria-current={pathname === "/obras" ? "page" : undefined} className={rowClass(pathname === "/obras")} onClick={closeMobile}>
              <Icon name="panel" />
              <span className="min-w-0 flex-1 truncate">Panel</span>
            </Link>
          </li>
        </ul>
        {visibleGroups.map(({ group, items }) => {
          const groupBadge = items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
          const expanded = needle ? true : (openGroups[group.label] ?? false);
          const gid = `obra-sidebar-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
          return (
            <div key={group.label} className="mb-1">
              <button
                type="button"
                onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !expanded }))}
                aria-expanded={expanded}
                aria-controls={gid}
                className="flex w-full items-center gap-1 rounded-control px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <span className="min-w-0 flex-1 truncate text-start">{group.label}</span>
                {groupBadge > 0 ? (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">{groupBadge}</span>
                ) : null}
                <Chevron open={expanded} />
              </button>
              {expanded ? (
                <ul id={gid} className="mt-0.5 flex flex-col gap-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const badge = item.section === "estadosPago" ? (pendingEP ?? 0) : 0;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={closeMobile}
                          className={rowClass(active)}
                        >
                          <Icon name={item.section} />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {badge > 0 ? (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary-foreground">{badge}</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
        {needle && visibleGroups.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Sin resultados para <span className="font-medium text-foreground">{query}</span>.</p>
        ) : null}
      </div>

      {/* Cuenta */}
      <div className="border-t border-border p-2">
        <UserMenu compact userName={userName} userEmail={userEmail} roleLabel={obraRoleLabel(role)} logout={logout} />
      </div>
    </nav>
  );

  return (
    <>
      {/* Barra superior móvil: identidad y acceso al menú */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5 lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-haspopup="dialog"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-foreground transition-colors hover:bg-background"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          </svg>
        </span>
        <span className="truncate text-sm font-semibold tracking-tight">Obras</span>
        <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground" title={obraName}>{obraName}</span>
      </header>

      {/* Drawer móvil */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-foreground/40"
            onClick={closeMobile}
          />
          <aside
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border bg-surface"
          >
            {nav}
          </aside>
        </div>
      ) : null}

      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex print:hidden">
        {nav}
      </aside>
    </>
  );
}
