"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";

import type { InventoryAccess, Role } from "@/generated/prisma/client";
import { canAccess, effectiveInventoryAccess, type Section } from "@/lib/permissions";

const iconCls = "h-5 w-5 shrink-0";

function Icon({ name }: { name: string }) {
  switch (name) {
    case "panel":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "compras":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case "ventas":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "gastos":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" />
        </svg>
      );
    case "rrhh":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "clientes":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "proveedores":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" />
        </svg>
      );
    case "banco":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M3 21h18" /><path d="M3 10l9-6 9 6" /><path d="M5 10v8" /><path d="M9.5 10v8" /><path d="M14.5 10v8" /><path d="M19 10v8" /><path d="M3 18h18" />
        </svg>
      );
    case "caja":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M3 8a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" /><path d="M3 8v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M21 9h-4a2 2 0 0 0 0 4h4a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
        </svg>
      );
    case "reportes":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
        </svg>
      );
    case "productos":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" />
        </svg>
      );
    case "movimientos":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    case "conteos":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h4" />
        </svg>
      );
    case "auditoria":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "catalogos":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      );
    case "importar":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case "comisiones":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      );
    case "asignaciones":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 14.5l2 2 4-4" />
        </svg>
      );
    case "vendedores":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "cierres":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      );
    case "configuracion":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

type SidebarChild = { href: string; label: string };

type SidebarItem = {
  href: string;
  label: string;
  section: Section;
  icon: string;
  children?: SidebarChild[];
};

type SidebarGroup = { label: string; items: SidebarItem[] };

const groups: SidebarGroup[] = [
  {
    label: "Movimientos",
    items: [
      {
        href: "/dashboard/compras",
        label: "Compras",
        section: "compras",
        icon: "compras",
        children: [
          { href: "/dashboard/compras/orden-compra", label: "Orden de Compra" },
          { href: "/dashboard/compras", label: "Facturas de Compra" },
        ],
      },
      {
        href: "/dashboard/ventas",
        label: "Ventas",
        section: "ventas",
        icon: "ventas",
        children: [
          { href: "/dashboard/ventas/cotizaciones", label: "Cotizaciones" },
          { href: "/dashboard/ventas/guias", label: "Guías de Despacho" },
          { href: "/dashboard/ventas/nota-credito", label: "Nota de Crédito" },
          { href: "/dashboard/ventas/nota-debito", label: "Nota de Débito" },
          { href: "/dashboard/ventas", label: "Facturas de Venta" },
        ],
      },
      { href: "/dashboard/gastos", label: "Gastos", section: "gastos", icon: "gastos" },
      { href: "/dashboard/banco", label: "Banco", section: "banco", icon: "banco" },
      { href: "/dashboard/rrhh", label: "RRHH", section: "rrhh", icon: "rrhh" },
    ],
  },
  {
    label: "Inventario",
    items: [
      { href: "/dashboard/inventario", label: "Productos", section: "inventario", icon: "productos" },
      { href: "/dashboard/inventario/movimientos", label: "Movimientos", section: "inventario", icon: "movimientos" },
      { href: "/dashboard/inventario/conteos", label: "Conteos", section: "inventario", icon: "conteos" },
    ],
  },
  {
    label: "Comisiones",
    items: [
      { href: "/dashboard/comisiones", label: "Resumen", section: "comisiones", icon: "comisiones" },
      { href: "/dashboard/comisiones/asignaciones", label: "Asignaciones", section: "comisiones", icon: "asignaciones" },
      { href: "/dashboard/comisiones/vendedores", label: "Vendedores", section: "comisiones", icon: "vendedores" },
      { href: "/dashboard/comisiones/cierres", label: "Cierres", section: "comisiones", icon: "cierres" },
    ],
  },
  {
    label: "Terceros",
    items: [
      { href: "/dashboard/clientes", label: "Clientes", section: "clientes", icon: "clientes" },
      { href: "/dashboard/proveedores", label: "Proveedores", section: "proveedores", icon: "proveedores" },
    ],
  },
  {
    label: "Análisis",
    items: [
      {
        href: "/dashboard/reportes",
        label: "Reportes",
        section: "reportes",
        icon: "reportes",
        children: [
          { href: "/dashboard/reportes", label: "Resumen" },
          { href: "/dashboard/reportes/caja", label: "Flujo de caja" },
          { href: "/dashboard/reportes/iva", label: "IVA mensual" },
          { href: "/dashboard/reportes/libro-compras", label: "Libro de compras" },
          { href: "/dashboard/reportes/libro-ventas", label: "Libro de ventas" },
          { href: "/dashboard/reportes/pagos", label: "Pagos y deudas" },
          { href: "/dashboard/reportes/gastos", label: "Gastos por área" },
        ],
      },
      { href: "/dashboard/auditoria", label: "Auditoría", section: "auditoria", icon: "auditoria" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/dashboard/catalogos", label: "Catálogos", section: "catalogos", icon: "catalogos" },
      { href: "/dashboard/importar", label: "Importar", section: "importar", icon: "importar" },
      { href: "/dashboard/configuracion", label: "Configuración", section: "configuracion", icon: "configuracion" },
    ],
  },
];

/**
 * Ícono que representa a cada grupo en el sidebar colapsado: ahí no caben los
 * ítems, así que el rail muestra un ícono por grupo y el resto vive en un panel
 * flotante con etiquetas.
 */
const groupIcons: Record<string, string> = {
  Movimientos: "caja",
  Inventario: "productos",
  Comisiones: "comisiones",
  Terceros: "clientes",
  Análisis: "reportes",
  Administración: "configuracion",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={"h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200 " + (open ? "rotate-90" : "")}
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/**
 * Contenedor de lista colapsable con altura animada. Se mide el contenido con
 * JS (scrollHeight) porque la técnica grid 0fr→1fr no es fiable en todos los
 * navegadores: al abrir se transiciona 0 → altura real → auto; al cerrar se
 * fija la altura actual → 0. `inert` + `aria-hidden` sacan el contenido
 * colapsado del orden de tabulación y de los lectores de pantalla.
 */
function CollapsibleList({
  id,
  expanded,
  innerClass = "",
  children,
}: {
  id: string;
  expanded: boolean;
  innerClass?: string;
  children: React.ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [height, setHeight] = useState<number | "auto">(expanded ? "auto" : 0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (expanded) {
      setHeight(list.scrollHeight);
      const timer = setTimeout(() => setHeight("auto"), 200);
      return () => clearTimeout(timer);
    }
    // Colapsar: fijar la altura actual en px para que la transición corra.
    setHeight(list.scrollHeight);
    const raf = requestAnimationFrame(() => setHeight(0));
    return () => cancelAnimationFrame(raf);
  }, [expanded]);

  return (
    <div
      id={id}
      aria-hidden={!expanded}
      inert={!expanded}
      className="overflow-hidden transition-[height] duration-[180ms] ease-out motion-reduce:transition-none"
      style={{ height }}
    >
      <ul
        ref={listRef}
        className={
          "transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none " +
          (expanded ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0") +
          " " +
          innerClass
        }
      >
        {children}
      </ul>
    </div>
  );
}

function matches(label: string, needle: string) {
  return label.toLowerCase().includes(needle);
}

// Un grupo que coincide conserva todos sus ítems; el que no coincide sobrevive
// solo por los ítems (o hijos) que coinciden. Todo se calcula en el render.
function filterItems(items: SidebarItem[], needle: string): SidebarItem[] {
  if (!needle) return items;
  return items
    .map((item) =>
      matches(item.label, needle)
        ? item
        : { ...item, children: item.children?.filter((child) => matches(child.label, needle)) },
    )
    .filter((item) => matches(item.label, needle) || (item.children?.length ?? 0) > 0);
}

function ChevronsUpDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true">
      <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
    </svg>
  );
}

/**
 * Menú de usuario: iniciales + nombre + rol en el trigger; desplegable hacia
 * arriba con el correo y la salida de sesión. En `compact` (sidebar colapsado)
 * el trigger es solo el avatar; el desplegable es igual.
 */
function UserMenu({
  userName,
  userEmail,
  roleLabel,
  logout,
  compact = false,
}: {
  userName: string;
  userEmail: string;
  roleLabel: string;
  logout: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={compact ? `Cuenta de ${userName}` : undefined}
        onClick={() => setOpen((v) => !v)}
        className={
          "flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors hover:bg-background " +
          (compact ? "justify-center" : "")
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {initials || "?"}
        </span>
        {compact ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
            <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
          </span>
        )}
        {compact ? null : <ChevronsUpDown />}
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-64 rounded-card border border-border bg-surface p-1 shadow-lg">
          <div className="px-2 py-1.5">
            <div className="truncate text-sm font-medium text-foreground">{userName}</div>
            <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
          </div>
          <div className="mx-1 my-1 border-t border-border" />
          <ul className="flex flex-col">
            <li>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <LogOutIcon />
                  Salir
                </button>
              </form>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Pendientes por ítem: ventas por cobrar y movimientos bancarios sin conciliar
 * son trabajo que espera a alguien, así que se avisan en el menú.
 */
function itemPending(item: SidebarItem, pendingSales: number, pendingBank: number): number {
  if (item.section === "ventas") return pendingSales;
  if (item.section === "banco") return pendingBank;
  return 0;
}

/** En el rail colapsado el aviso va por grupo: el desglose vive en el panel. */
function groupPending(group: SidebarGroup, pendingSales: number, pendingBank: number): number {
  return group.items.reduce((acc, item) => acc + itemPending(item, pendingSales, pendingBank), 0);
}

function rowClass(active: boolean) {
  return (
    "flex items-center gap-3 rounded-control px-2 py-2 text-sm transition-colors " +
    (active
      ? "bg-primary-soft font-medium text-primary"
      : "text-muted-foreground hover:bg-background hover:text-foreground")
  );
}

/**
 * Ítem del menú: enlace plano o, si tiene hijos, un sub-árbol desplegable.
 * La expansión llega calculada desde el grupo (búsqueda forzada, override o
 * hijo activo).
 */
function SidebarNavItem({
  item,
  pathname,
  pendingSales,
  pendingBank,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: SidebarItem;
  pathname: string;
  pendingSales: number;
  pendingBank: number;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  if (!item.children || item.children.length === 0) {
    const active = isActive(pathname, item.href);
    const pending = itemPending(item, pendingSales, pendingBank);
    const badge = pending > 0 ? pending : null;
    return (
      <li>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={rowClass(active)}
        >
          <Icon name={item.icon} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {badge ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {badge}
            </span>
          ) : null}
        </Link>
      </li>
    );
  }

  const childActive = item.children.some((child) => isActive(pathname, child.href));
  const subId = `sidebar-sub-${item.label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={subId}
        className={rowClass(childActive)}
      >
        <Icon name={item.icon} />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <Chevron open={expanded} />
      </button>
      {/* Siempre montado para que la animación de cierre se vea */}
      <CollapsibleList
        id={subId}
        expanded={expanded}
        innerClass="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2"
      >
        {item.children.map((child) => {
          // Los hijos son rutas exactas: /reportes no debe marcarse activo
          // cuando estás en /reportes/caja.
          const active = pathname === child.href;
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={
                  "block truncate rounded-control px-2 py-1.5 text-sm transition-colors " +
                  (active
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-muted-foreground hover:bg-background hover:text-foreground")
                }
              >
                {child.label}
              </Link>
            </li>
          );
        })}
      </CollapsibleList>
    </li>
  );
}

export type SidebarProps = {
  role: Role | null;
  inventoryAccess?: InventoryAccess;
  userName: string;
  userEmail: string;
  roleLabel: string;
  companyName: string;
  pendingSales: number;
  /** Movimientos bancarios sin conciliar: trabajo pendiente de contabilidad. */
  pendingBank: number;
  logout: () => void;
};

export function Sidebar(props: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Colapso del sidebar (solo escritorio), persistido en localStorage.
  const [collapsed, setCollapsed] = useState(false);
  // Overrides de apertura por grupo/ítem; al navegar se limpian para que la
  // rama activa vuelva a abrirse sola (ajuste en render, sin effect).
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  // Restaurar preferencia de colapso en el primer render (ajuste en render).
  const [collapsedReady, setCollapsedReady] = useState(false);
  if (!collapsedReady) {
    setCollapsedReady(true);
    try {
      const saved = localStorage.getItem("facturas_sidebar_collapsed");
      if (saved === "true") setCollapsed(true);
    } catch { /* sin localStorage */ }
  }

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("facturas_sidebar_collapsed", String(next));
      } catch { /* sin localStorage */ }
      return next;
    });
  };

  // Panel flotante del rail colapsado: qué grupo está abierto y dónde anclarlo.
  const [openGroup, setOpenGroup] = useState<{ label: string; left: number; top: number } | null>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelCloseFlyout = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const closeFlyout = () => {
    cancelCloseFlyout();
    setOpenGroup(null);
  };

  // Cierre diferido: al cruzar el espacio entre el ícono y el panel el puntero
  // sale del wrapper por unos milisegundos; sin esta gracia el panel se cerraría.
  const scheduleCloseFlyout = () => {
    cancelCloseFlyout();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpenGroup(null);
    }, 140);
  };

  const openFlyout = (label: string, trigger: HTMLElement) => {
    cancelCloseFlyout();
    const triggerRect = trigger.getBoundingClientRect();
    // Anclado al borde derecho del rail (no al del ícono, que queda adentro):
    // el panel no debe montarse sobre la franja de íconos.
    const railRight = trigger.closest("aside")?.getBoundingClientRect().right ?? triggerRect.right;
    // El top se limita para que un grupo largo (Movimientos) no se salga abajo.
    const maxTop = Math.max(8, window.innerHeight - 380);
    setOpenGroup({
      label,
      left: Math.round(railRight + 4),
      top: Math.round(Math.min(triggerRect.top, maxTop)),
    });
  };

  useEffect(() => () => cancelCloseFlyout(), []);

  useEffect(() => {
    if (!openGroup) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openGroup]);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOverrides({});
    setQuery("");
    setMobileOpen(false);
    setOpenGroup(null);
  }

  const closeMobile = () => setMobileOpen(false);

  // Drawer móvil: cierra con Escape, bloquea el scroll de fondo y recibe el foco.
  const drawerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const needle = query.trim().toLowerCase();
  const filtering = needle !== "";
  const canSee = (item: SidebarItem) => {
    if (item.section === "panel") return true;
    if (item.section === "configuracion") return props.role ? canAccess(props.role, "configuracion") : true;
    if (item.section === "inventario") {
      return props.role ? effectiveInventoryAccess(props.role, props.inventoryAccess) !== "NONE" : false;
    }
    return props.role ? canAccess(props.role, item.section) : false;
  };

  const visibleGroups = groups
    .map((group) => ({ group, items: filterItems(group.items, needle).filter(canSee) }))
    .filter((entry) => entry.items.length > 0);

  const groupContainsActive = (group: SidebarGroup) =>
    group.items.some(
      (item) => isActive(pathname, item.href) || item.children?.some((child) => isActive(pathname, child.href)),
    );

  const toggle = (key: string, current: boolean) => {
    setOverrides((prev) => ({ ...prev, [key]: !current }));
  };

  // --- Nav colapsado (un ícono por grupo + panel flotante) --------------------
  const collapsedIconClass = (active: boolean) =>
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-control transition-colors " +
    (active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-background hover:text-foreground");

  const collapsedNav = (
    <nav aria-label="Secciones" className="flex h-full min-h-0 flex-col">
      {/* Marca + expandir: el control vive arriba, lejos de la cuenta de abajo */}
      <div className="flex flex-col items-center gap-1.5 border-b border-border px-2 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          </svg>
        </span>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expandir menú"
          title="Expandir menú"
          className="flex h-7 w-full items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Íconos: Panel directo y un ícono por grupo. Sin comprimir: los ítems
          llevan shrink-0 y el contenedor hace scroll si la pantalla es baja. */}
      <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto p-2" onScroll={closeFlyout}>
        <Fragment>
          <Link
            href="/dashboard"
            title="Panel"
            aria-current={isActive(pathname, "/dashboard") ? "page" : undefined}
            className={collapsedIconClass(isActive(pathname, "/dashboard"))}
          >
            <Icon name="panel" />
          </Link>
          <div className="my-0.5 h-px w-6 shrink-0 bg-border" aria-hidden="true" />
        </Fragment>
        {groups.map((group) => {
          const items = group.items.filter(canSee);
          if (items.length === 0) return null;
          const containsActive = groupContainsActive(group);
          const open = openGroup?.label === group.label;
          const flyoutId = `sidebar-flyout-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
          const pending = groupPending(group, props.pendingSales, props.pendingBank);
          const badge = pending > 0 ? pending : null;
          return (
            <div key={group.label} className="relative shrink-0" onMouseLeave={scheduleCloseFlyout}>
              <button
                type="button"
                onClick={(event) =>
                  open ? closeFlyout() : openFlyout(group.label, event.currentTarget)
                }
                onMouseEnter={(event) => {
                  // Con un panel ya abierto, pasar el mouse por otro ícono cambia de panel.
                  if (openGroup) openFlyout(group.label, event.currentTarget);
                }}
                aria-expanded={open}
                aria-haspopup="true"
                aria-controls={flyoutId}
                aria-label={badge ? `${group.label}, ${badge} pendientes` : group.label}
                title={badge ? `${group.label} · ${badge} pendientes` : group.label}
                className={collapsedIconClass(containsActive) + (open ? " bg-background" : "")}
              >
                <Icon name={groupIcons[group.label] ?? "panel"} />
                {badge ? (
                  <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">
                    {badge}
                  </span>
                ) : null}
              </button>

              {open ? (
                <div
                  id={flyoutId}
                  role="group"
                  aria-label={group.label}
                  onMouseEnter={cancelCloseFlyout}
                  style={{ left: openGroup.left, top: openGroup.top }}
                  className="fixed z-40 max-h-[calc(100vh-1rem)] w-60 overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-lg"
                >
                  <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {items.map((item) => {
                      const active =
                        isActive(pathname, item.href) ||
                        item.children?.some((child) => isActive(pathname, child.href));
                      const itemPendingCount = itemPending(item, props.pendingSales, props.pendingBank);
                      const itemBadge = itemPendingCount > 0 ? itemPendingCount : null;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={closeFlyout}
                            aria-current={active ? "page" : undefined}
                            className={rowClass(!!active)}
                          >
                            <Icon name={item.icon} />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {itemBadge ? (
                              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                                {itemBadge}
                              </span>
                            ) : null}
                          </Link>
                          {item.children?.length ? (
                            <ul className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
                              {item.children.map((child) => {
                                const childActive = pathname === child.href;
                                return (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      onClick={closeFlyout}
                                      aria-current={childActive ? "page" : undefined}
                                      className={
                                        "block truncate rounded-control px-2 py-1.5 text-sm transition-colors " +
                                        (childActive
                                          ? "bg-primary-soft font-medium text-primary"
                                          : "text-muted-foreground hover:bg-background hover:text-foreground")
                                      }
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Cuenta */}
      <div className="border-t border-border p-2">
        <UserMenu
          compact
          userName={props.userName}
          userEmail={props.userEmail}
          roleLabel={props.roleLabel}
          logout={props.logout}
        />
      </div>
    </nav>
  );

  // --- Nav expandido (con grupos, buscador y sub-árboles) --------------------
  const nav = (
    <nav aria-label="Secciones" className="flex h-full min-h-0 flex-col">
      {/* Marca + empresa + buscador */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            </svg>
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">Facturas</span>
          <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground" title={props.companyName}>
            {props.companyName}
          </span>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Contraer menú"
            title="Contraer menú"
            className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-background hover:text-foreground lg:flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Cerrar menú"
            title="Cerrar menú"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-background hover:text-foreground lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <label htmlFor="sidebar-search" className="sr-only">
          Buscar secciones
        </label>
        <div className="relative mt-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            id="sidebar-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar…"
            className="h-9 w-full rounded-control border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>
      </div>

      {/* Grupos colapsables */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Panel: ítem independiente, fuera de los grupos */}
        {!filtering || matches("Panel", needle) ? (
          <ul className="mb-1">
            <li>
              <Link
                href="/dashboard"
                aria-current={isActive(pathname, "/dashboard") ? "page" : undefined}
                onClick={closeMobile}
                className={rowClass(isActive(pathname, "/dashboard"))}
              >
                <Icon name="panel" />
                <span className="min-w-0 flex-1 truncate">Panel</span>
              </Link>
            </li>
          </ul>
        ) : null}
        {visibleGroups.map(({ group, items }) => {
          const containsActive = groupContainsActive(group);
          const expanded = filtering ? true : (overrides[group.label] ?? containsActive);
          const groupId = `sidebar-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
          return (
            <div key={group.label} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(group.label, expanded)}
                aria-expanded={expanded}
                aria-controls={groupId}
                className="flex w-full items-center gap-1 rounded-control px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <span className="min-w-0 flex-1 truncate text-start">{group.label}</span>
                <Chevron open={expanded} />
              </button>
              {/* Siempre montado: la animación de cierre necesita el nodo en el DOM */}
              <CollapsibleList id={groupId} expanded={expanded} innerClass="mt-0.5 flex flex-col gap-0.5">
                  {items.map((item) => {
                    const itemExpanded =
                      filtering
                        ? true
                        : (overrides[item.label] ??
                          (item.children?.some((child) => isActive(pathname, child.href)) ?? false));
                    return (
                      <SidebarNavItem
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        pendingSales={props.pendingSales}
                        pendingBank={props.pendingBank}
                        expanded={itemExpanded}
                        onToggle={() => toggle(item.label, itemExpanded)}
                        onNavigate={closeMobile}
                      />
                    );
                  })}
                </CollapsibleList>
            </div>
          );
        })}
        {filtering && visibleGroups.length === 0 && !matches("Panel", needle) ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Sin resultados para <span className="font-medium text-foreground">{query}</span>.
          </p>
        ) : null}
      </div>

      {/* Usuario */}
      <div className="border-t border-border p-2">
        <UserMenu
          userName={props.userName}
          userEmail={props.userEmail}
          roleLabel={props.roleLabel}
          logout={props.logout}
        />
      </div>
    </nav>
  );

  return (
    <>
      {/* Barra superior móvil: identidad y acceso al menú; las acciones quedan
          en la barra del layout (cambiar empresa, tema, notificaciones). */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5 lg:hidden">
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
        <span className="truncate text-sm font-semibold tracking-tight">Facturas</span>
        <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground" title={props.companyName}>
          {props.companyName}
        </span>
      </header>

      {/* Drawer móvil */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-surface"
          >
            {nav}
          </aside>
        </div>
      ) : null}

      {/* Sidebar escritorio: colapsable con transición de ancho */}
      <aside
        className={
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-[180ms] ease-out lg:flex " +
          (collapsed ? "w-18" : "w-64")
        }
      >
        {collapsed ? collapsedNav : nav}
      </aside>
    </>
  );
}
