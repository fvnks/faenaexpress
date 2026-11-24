"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const iconCls = "h-4 w-4 shrink-0";

function ChevronsUpDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true">
      <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
    </svg>
  );
}

function AccountIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>;
}
function KeyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M17 6l2 2M14 9l2 2" /></svg>;
}
function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></svg>;
}
function SessionsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
}
function ConsoleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h4M7 13h7M17 9h.01" /></svg>;
}
function OrgIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>;
}
function ArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
}
function LogOutIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>;
}

type BaseProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  isPlatformStaff?: boolean;
  logout: () => void;
  compact?: boolean;
};

type HeaderExtras = {
  /** Variante rica para pantallas de entrada (selector de módulos). */
  variant?: "sidebar" | "header";
  orgName?: string | null;
  mustChangePassword?: boolean;
  twoFactorActive?: boolean;
  twoFactorRecommended?: boolean;
  otherSessions?: number;
  isOrgManager?: boolean;
  lastModule?: { name: string; href: string } | null;
};

type Props = BaseProps & HeaderExtras;

function Item({ href, icon, children, onClick }: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="group flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        <ArrowIcon />
      </Link>
    </li>
  );
}

export function UserMenu({
  userName,
  userEmail,
  roleLabel,
  isPlatformStaff,
  logout,
  compact = false,
  variant = "sidebar",
  orgName,
  mustChangePassword = false,
  twoFactorActive = false,
  twoFactorRecommended = false,
  otherSessions = 0,
  isOrgManager = false,
  lastModule = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isHeader = variant === "header";

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

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={compact ? `Cuenta de ${userName}` : `Menú de ${userName}`}
        onClick={() => setOpen((value) => !value)}
        className={
          isHeader
            ? "flex items-center gap-2.5 rounded-control border border-border bg-surface px-2 py-1.5 text-left transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            : "flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors hover:bg-background " + (compact ? "justify-center" : "")
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {initials || "?"}
        </span>
        {compact ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
            <span className="block truncate text-xs text-muted-foreground">{isHeader ? (orgName ?? roleLabel) : roleLabel}</span>
          </span>
        )}
        <ChevronsUpDown />
      </button>

      {open ? (
        <div
          className={
            "user-menu-pop z-40 w-72 rounded-card border border-border bg-surface p-1 shadow-lg " +
            (isHeader ? "absolute right-0 top-full mt-2" : "absolute bottom-full left-0 mb-2")
          }
        >
          <div className="px-2 py-2">
            <div className="truncate text-sm font-medium text-foreground">{userName}</div>
            <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
            <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-subtle">{roleLabel}{orgName ? ` · ${orgName}` : ""}</div>
          </div>

          {/* Avisos de seguridad: están en el menú para que sean accionables sin entrar a /perfil */}
          {isHeader && (mustChangePassword || twoFactorRecommended || otherSessions > 0) ? (
            <div className="mx-1 mb-1 space-y-1.5 rounded-control border border-border bg-background/60 p-2">
              {mustChangePassword ? (
                <Link href="/perfil#password" onClick={close} className="flex items-center gap-2 text-xs text-primary hover:underline">
                  <KeyIcon /> Contraseña provisional — cámbiala ya
                </Link>
              ) : null}
              {twoFactorRecommended && !twoFactorActive ? (
                <Link href="/perfil#2fa" onClick={close} className="flex items-center gap-2 text-xs text-accent hover:underline">
                  <ShieldIcon /> Te recomendamos activar el 2FA
                </Link>
              ) : null}
              {twoFactorActive ? (
                <p className="flex items-center gap-2 text-xs text-success"><ShieldIcon /> Segundo factor activo</p>
              ) : null}
              {otherSessions > 0 ? (
                <Link href="/perfil#sesiones" onClick={close} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:underline">
                  <SessionsIcon /> {otherSessions} sesión(es) abiertas en otro lugar
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="mx-1 my-1 border-t border-border" />
          <ul className="flex flex-col">
            <Item href="/perfil" icon={<AccountIcon />} onClick={close}>Mi cuenta y seguridad</Item>
            {isHeader ? (
              <>
                <Item href="/perfil#password" icon={<KeyIcon />} onClick={close}>Cambiar contraseña</Item>
                <Item href="/perfil#2fa" icon={<ShieldIcon />} onClick={close}>Segundo factor</Item>
                <Item href="/perfil#sesiones" icon={<SessionsIcon />} onClick={close}>Sesiones y accesos</Item>
                {lastModule ? (
                  <Item href={lastModule.href} icon={<ArrowIcon />} onClick={close}>Continuar en {lastModule.name}</Item>
                ) : null}
                {isOrgManager ? (
                  <Item href="/facturas/organizacion" icon={<OrgIcon />} onClick={close}>Organización</Item>
                ) : null}
                <Item href="/billing" icon={<OrgIcon />} onClick={close}>Facturación SaaS</Item>
              </>
            ) : null}
            {isPlatformStaff ? (
              <Item href="/admin" icon={<ConsoleIcon />} onClick={close}>Consola de operador</Item>
            ) : null}
          </ul>
          <div className="mx-1 my-1 border-t border-border" />
          <form action={logout}>
            <button
              type="submit"
              className="group flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            >
              <LogOutIcon />
              <span className="flex-1">Salir</span>
              <ArrowIcon />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
