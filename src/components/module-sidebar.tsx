"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import clsx from "clsx";

import { UserMenu } from "@/components/user-menu";
import { useOnline } from "@/components/connection-status";
import { controlClass } from "@/lib/ui";

export type ModuleNavItem = { href: string; label: string; icon?: string; badge?: number };
export type ModuleNavGroup = { label: string; items: ModuleNavItem[] };

const ICONS: Record<string, string> = {
  panel: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  asistencia: "M4 3h16v18H4zM8 8h3v3H8zM8 14h3v3H8zM14 8h3v3h-3z",
  calificaciones: "M4 19h16M7 16V9M12 16V5M17 16v-7",
  promocion: "M3 17l6-6 4 4 8-8M15 7h6v6",
  libro: "M4 3h14a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2zM8 8h8M8 12h8",
  estudiantes: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  apoderados: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87",
  cursos: "M3 5h18v14H3zM3 9h18M8 13h3M14 13h3",
  docentes: "M12 3 2 8l10 5 10-5zM6 11v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5",
  equipo: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  comunicacion: "M4 4h16v12H8l-4 4zM8 9h8M8 12h5",
  convivencia: "M12 3 4 6v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V6zM9 12l2 2 4-4",
  citas: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
  calendario: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
  venta: "M4 4h3l2 12h11l2-8H8M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  ventas: "M4 19V9M10 19V4M16 19v-7M22 19H2",
  cuenta: "M3 7h18v12H3zM3 11h18M7 15h4",
  productos: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  caja: "M4 8h16v12H4zM4 12h16M8 16h4",
  terminales: "M3 4h18v12H3zM8 20h8M12 16v4",
  reportes: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  sincronizar: "M20 11a8 8 0 1 0-2 6M20 5v6h-6",
  TPV: "M3 5h18v14H3zM7 9h3v3H7zM14 9h3v3h-3zM7 15h10",
  etiquetas: "M3 7l8-4 10 10-8 8zM7 11h.01",
  cocina: "M5 3h14v6a7 7 0 0 1-14 0zM12 16v5M8 21h8",
  administracion: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 15a7 7 0 0 0 0-6M5 9a7 7 0 0 0 0 6",
};

const BRAND_ICONS: Record<string, string> = {
  school: "M3 9l9-5 9 5-9 5zM6 11v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5M21 9v6",
  pos: "M4 3h16v18H4zM8 7h8M8 11h3v3H8zM14 11h3v3h-3zM8 17h8",
};

function Icon({ name, className = "h-4 w-4 shrink-0" }: { name?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name ?? "panel"] ?? ICONS.panel} />
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

function rowClass(active: boolean) {
  return clsx(
    "flex items-center gap-3 rounded-control px-2 py-2 text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
    active
      ? "bg-primary-soft font-medium text-primary"
      : "text-muted-foreground hover:bg-background hover:text-foreground",
  );
}

/**
 * Rail lateral compartido por Colegios y Punto de Venta: misma línea visual
 * que el sidebar de Facturas/Obras (marca, búsqueda, grupos colapsables,
 * active en primary-soft, UserMenu al pie y drawer móvil).
 */
export function ModuleSidebar({
  brand,
  brandIcon,
  scopeName,
  groups,
  homeHref,
  homeLabel,
  userName,
  userEmail,
  roleLabel,
  logout,
  showConnection = false,
}: {
  brand: string;
  brandIcon: keyof typeof BRAND_ICONS;
  scopeName: string;
  groups: ModuleNavGroup[];
  homeHref: string;
  homeLabel: string;
  userName: string;
  userEmail: string;
  roleLabel: string;
  logout: () => void;
  showConnection?: boolean;
}) {
  const pathname = usePathname();
  const online = useOnline();
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const needle = query.trim().toLowerCase();

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      next[group.label] = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    }
    setOpenGroups(next);
  }, [pathname, groups]);

  const visibles = useMemo(
    () =>
      groups
        .map((group) => ({
          group,
          items: group.items.filter((item) => !needle || item.label.toLowerCase().includes(needle)),
        }))
        .filter((g) => g.items.length > 0),
    [groups, needle],
  );

  useEffect(() => {
    if (mobileOpen) drawerRef.current?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (event.key === "/" && !(["INPUT", "TEXTAREA"].includes(tag))) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const handleLink = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    closeMobile();
  };

  const nav = (
    <nav aria-label={`Secciones de ${brand}`} className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d={BRAND_ICONS[brandIcon]} />
            </svg>
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">{brand}</span>
          <span className="ml-auto min-w-0 truncate text-right text-xs text-muted-foreground" title={scopeName}>
            {scopeName}
          </span>
        </div>
        <div className="relative mt-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar secciones…"
            className={controlClass + " h-9 w-full pl-9"}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="mb-1">
          <li>
            <Link href={homeHref} onClick={handleLink} aria-current={pathname === homeHref ? "page" : undefined} className={rowClass(pathname === homeHref)}>
              <Icon name="panel" />
              <span className="min-w-0 flex-1 truncate">{homeLabel}</span>
            </Link>
          </li>
        </ul>
        {visibles.map(({ group, items }) => {
          const badge = items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
          const expanded = needle ? true : (openGroups[group.label] ?? false);
          const gid = `module-sidebar-${brand.toLowerCase().replace(/\s+/g, "-")}-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
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
                {badge > 0 ? (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">{badge}</span>
                ) : null}
                <Chevron open={expanded} />
              </button>
              {expanded ? (
                <ul id={gid} className="mt-0.5 flex flex-col gap-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const itemBadge = item.badge ?? 0;
                    return (
                      <li key={item.href}>
                        <Link href={item.href} onClick={handleLink} aria-current={active ? "page" : undefined} className={rowClass(active)}>
                          <Icon name={item.icon} />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {itemBadge > 0 ? (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary-foreground">{itemBadge}</span>
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
        {needle && visibles.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Sin resultados para <span className="font-medium text-foreground">{query}</span>.</p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-border p-2">
        {showConnection && !online ? (
          <p role="status" className="rounded-control bg-danger-soft px-2 py-1.5 text-xs text-danger">Sin conexión</p>
        ) : null}
        <UserMenu compact userName={userName} userEmail={userEmail} roleLabel={roleLabel} logout={logout} />
      </div>
    </nav>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5 lg:hidden print:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" aria-haspopup="dialog" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-foreground transition-colors hover:bg-background">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d={BRAND_ICONS[brandIcon]} />
          </svg>
        </span>
        <span className="truncate text-sm font-semibold tracking-tight">{brand}</span>
        <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground" title={scopeName}>{scopeName}</span>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-foreground/40" onClick={closeMobile} />
          <aside ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Menú de navegación" className="absolute left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border bg-surface">
            {nav}
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex print:hidden">
        {nav}
      </aside>
    </>
  );
}
