"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ConnectionStatus } from "@/components/connection-status";

const LINKS = [
  { href: "/pos", label: "Resumen" },
  { href: "/pos/venta", label: "Vender" },
  { href: "/pos/ventas", label: "Ventas" },
  { href: "/pos/credito", label: "Cuenta corriente" },
  { href: "/pos/productos", label: "Productos" },
  { href: "/pos/caja", label: "Caja" },
  { href: "/pos/terminales", label: "Terminales" },
  { href: "/pos/reportes", label: "Reportes" },
  { href: "/pos/sincronizar", label: "Sincronizar" },
];

export function PosNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Punto de venta">
      {LINKS.map((link) => {
        const active =
          link.href === "/pos"
            ? pathname === "/pos"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-control px-3 py-1.5 text-sm transition-colors " +
              (active
                ? "bg-primary-soft font-semibold text-primary"
                : "text-muted-foreground hover:bg-background hover:text-foreground")
            }
          >
            {link.label}
          </Link>
        );
      })}
      <span className="ml-auto flex items-center gap-2">
        <ConnectionStatus />
      </span>
    </nav>
  );
}
