"use client";

import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "loading"> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline" | "link";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  asChild?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      loading = false,
      disabled,
      children,
      ...rest
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
      secondary: "bg-surface text-foreground border border-border hover:bg-secondary-soft hover:text-foreground",
      ghost: "bg-transparent text-foreground hover:bg-secondary-soft",
      destructive: "bg-danger text-danger-foreground hover:bg-danger/90 shadow-sm shadow-danger/20",
      outline: "bg-transparent border border-border text-foreground hover:bg-secondary-soft",
      link: "bg-transparent text-primary hover:text-primary-hover underline-offset-4 hover:underline",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
      md: "px-4 py-2.5 text-sm rounded-md gap-2",
      lg: "px-6 py-3 text-base rounded-lg gap-2",
      icon: "p-2 rounded-md",
      "icon-sm": "p-1.5 rounded-md",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ""}`}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };