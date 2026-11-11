"use client";

import Link from "next/link";

/**
 * Botón compuesto al estilo Astryx.
 * Sin build plugin, sin StyleX runtime: estilos en Tailwind + tokens CSS.
 */
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-black/20",
  secondary: "bg-surface text-foreground border border-border hover:bg-surface/50",
  outline: "border border-border text-foreground hover:bg-surface/50",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-surface/40",
  danger: "bg-danger text-danger-foreground hover:bg-danger/90",
};

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-3 text-sm font-semibold",
  lg: "px-8 py-4 text-base font-semibold",
};

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  href?: string;
  children: React.ReactNode;
  className?: string;
};

type ButtonNativeProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "variant" | "size" | "children" | "className" | "type" | "href"
>;

type ButtonLinkProps = Omit<
  React.ComponentPropsWithoutRef<"a">,
  "variant" | "size" | "children" | "className" | "href"
>;

export type ButtonProps = ButtonOwnProps & (ButtonNativeProps | ButtonLinkProps);

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  href,
  children,
  className,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

  const classes = [
    base,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].filter(Boolean).join(" ");

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        {...(props as ButtonLinkProps)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      disabled={disabled}
      className={classes}
      type="button"
      {...(props as ButtonNativeProps)}
    >
      {children}
    </button>
  );
}

/**
 * Botón solo con icono (sin texto).
 */
export function IconButton({
  variant = "ghost",
  size = "md",
  disabled = false,
  onClick,
  children,
  className,
  "aria-label": ariaLabel,
  ...props
}: ButtonProps & { onClick?: () => void; "aria-label": string }) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Botón de texto (sin fondo, sin borde).
 */
export function TextButton({
  variant = "ghost",
  size = "md",
  disabled = false,
  onClick,
  children,
  className,
  ...props
}: ButtonProps & { onClick?: () => void }) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
