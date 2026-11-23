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
      secondary: "bg-surface text-foreground border border-border",
      success: "bg-success-soft text-success",
      warning: "bg-accent-soft text-accent",
      danger: "bg-danger-soft text-danger",
      neutral: "bg-surface text-muted-foreground border border-border",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-[0.625rem]",
      md: "px-2.5 py-0.5 text-[0.6875rem]",
    };

    const variantClasses = variants[variant] || variants.neutral;
    const isNeutral = variant === "neutral" || variant === "secondary";
    const dotColor = variant === "warning" ? "accent" : variant === "secondary" ? "border-strong" : variant;

    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-[0.04em]",
          variantClasses,
          sizes[size],
          className,
        ].join(" ")}
        {...props}
      >
        {!isNeutral && (
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `var(--color-${dotColor})`,
            }}
          />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export { Badge };