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
      primary: "bg-primary/10 text-primary",
      secondary: "bg-secondary/10 text-secondary",
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      danger: "bg-danger/10 text-danger",
      neutral: "bg-secondary/10 text-muted-foreground",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-0.5 text-xs",
    };

    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center gap-1 rounded-full font-medium",
          variants[variant],
          sizes[size],
          "font-medium",
        ].join(" ")}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };