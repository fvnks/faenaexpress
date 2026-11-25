"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { PlatformLevel } from "@/generated/prisma/client";

// Navegación de la consola. Se muestran solo los ítems que el nivel permite, pero
// la autorización real vive en cada página y en cada Server Action: esto es
// comodidad, no seguridad.
type NavItem = {
  href: string;
  label: string;
  icon: string;
  min: PlatformLevel;
};

type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { href: "/admin", label: "Tablero", icon: "panel", min: "SUPPORT" },
      { href: "/admin/incidencias", label: "Incidencias", icon: "alert", min: "SUPPORT" },
    ],
  },
  {
    label: "Cuentas",
    items: [
      { href: "/admin/organizaciones", label: "Organizaciones", icon: "building", min: "SUPPORT" },
      { href: "/admin/usuarios", label: "Usuarios", icon: "users", min: "SUPPORT" },
      { href: "/admin/colegios", label: "Colegios", icon: "school", min: "SUPPORT" },
      { href: "/admin/obras", label: "Obras", icon: "obra", min: "SUPPORT" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/admin/planes", label: "Planes", icon: "plan", min: "SUPPORT" },
      { href: "/admin/modulos", label: "Módulos", icon: "module", min: "SUPPORT" },
    ],
  },
  {
    label: "Gobernanza",
    items: [{ href: "/admin/equipo", label: "Equipo", icon: "shield", min: "OWNER" }],
  },
];

const ICONS: Record<string, string> = {
  panel: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  alert: "M12 3 2 20h20zM12 9v5M12 17h.01",
  building: "M4 21V5l8-3v19M12 9h8v12M7 9v2M7 14v2M16 13v2",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  school: "M3 9l9-5 9 5-9 5zM6 11v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5",
  obra: "M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5M9 12h1M14 12h1",
  plan: "M4 4h16v16H4zM4 9h16M9 13h6M9 16h4",
  module: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  shield: "M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5zM9 12l2 2 4-4",
};

const RANK: Record<PlatformLevel, number> = { SUPPORT: 1, OPERATOR: 2, OWNER: 3 };

export function AdminNav({ level }: { level: PlatformLevel }) {
  const pathname = usePathname();
  const grupos = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => RANK[item.min] <= RANK[level]),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Consola" className="lg:w-52 lg:shrink-0">
      <div className="flex flex-col gap-4 lg:gap-5">
        {grupos.map((group) => (
          <div key={group.label}>
            <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:block">
              {group.label}
            </p>
            <ul className="flex flex-wrap gap-1 lg:flex lg:flex-col lg:gap-0.5">
              {group.items.map((item) => {
                // /admin solo coincide exacto; el resto coincide por prefijo.
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={
                        "flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors " +
                        (active
                          ? "bg-primary-soft font-semibold text-primary"
                          : "text-muted-foreground hover:bg-background hover:text-foreground")
                      }
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d={ICONS[item.icon]} />
                      </svg>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
