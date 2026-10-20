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
  /** Nivel mínimo para verlo. */
  min: PlatformLevel;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Tablero", min: "SUPPORT" },
  { href: "/admin/organizaciones", label: "Organizaciones", min: "SUPPORT" },
  { href: "/admin/modulos", label: "Módulos", min: "SUPPORT" },
  { href: "/admin/planes", label: "Planes", min: "SUPPORT" },
  { href: "/admin/usuarios", label: "Usuarios", min: "SUPPORT" },
  { href: "/admin/incidencias", label: "Incidencias", min: "SUPPORT" },
  { href: "/admin/equipo", label: "Equipo", min: "OWNER" },
];

const RANK: Record<PlatformLevel, number> = { SUPPORT: 1, OPERATOR: 2, OWNER: 3 };

export function AdminNav({ level }: { level: PlatformLevel }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => RANK[item.min] <= RANK[level]);

  return (
    <nav aria-label="Consola" className="lg:w-52 lg:shrink-0">
      <ul className="flex flex-wrap gap-1 lg:flex-col">
        {items.map((item) => {
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
                  "block rounded-control px-3 py-2 text-sm transition-colors " +
                  (active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-background hover:text-foreground")
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
