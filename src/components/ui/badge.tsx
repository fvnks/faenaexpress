"use client";

import { forwardRef } from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
  size?: "sm" | "md";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "neutral",
      size = "md",
      children,
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary: "bg-primary-soft text-primary",
      secondary: "bg-secondary-soft text-secondary",
      success: "bg-success-soft text-success",
      warning: "bg-warning-soft text-warning",
      danger: "bg-danger-soft text-danger",
      neutral: "bg-surface text-muted-foreground border border-border",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-[0.625rem]",
      md: "px-2.5 py-0.5 text-[0.6875rem]",
    };

    const variantClasses = variants[variant] || variants.neutral;
    const isNeutral = variant === "neutral";

    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-[0.04em]",
          variantClasses,
          sizes[size],
          className,
        ].join(" ")}
      >
        {!isNeutral && (
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `var(--color-${variant === "warning" ? "accent" : variant})`,
            }}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };