import type { ReactNode } from "react";

export type AlertVariant = "info" | "warning" | "destructive" | "success";

const alertStyles: Record<AlertVariant, { border: string; bg: string; icon: string }> = {
  info: {
    border: "border-primary",
    bg: "bg-primary-soft",
    icon: "text-primary",
  },
  warning: {
    border: "border-accent",
    bg: "bg-accent-soft",
    icon: "text-accent",
  },
  destructive: {
    border: "border-danger",
    bg: "bg-danger-soft",
    icon: "text-danger",
  },
  success: {
    border: "border-success",
    bg: "bg-success-soft",
    icon: "text-success",
  },
};

function AlertIcon({ variant }: { variant: AlertVariant }) {
  const cls = "h-5 w-5 shrink-0";

  if (variant === "warning" || variant === "destructive") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  if (variant === "success") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }

  // info
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/**
 * Alerta reutilizable con variante y acciones opcionales.
 * Sigue el patrón de shadcn/reui Alert con soporte para icono, título,
 * descripción y un elemento de acción (link o botón).
 */
export function Alert({
  variant = "info",
  title,
  children,
  action,
}: {
  variant?: AlertVariant;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const style = alertStyles[variant];

  return (
    <div
      role="alert"
      className={`rounded-card border p-4 ${style.border} ${style.bg}`}
    >
      <div className="flex items-start gap-3">
        <span className={style.icon}>
          <AlertIcon variant={variant} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {children ? (
            <div className="mt-0.5 text-sm opacity-80">{children}</div>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-center">{action}</div> : null}
      </div>
    </div>
  );
}