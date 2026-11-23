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
      "inline-flex items-center justify-center gap-2 font-semibold rounded-[4px] transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-primary text-primary-foreground hover:brightness-110 active:brightness-95",
      secondary: "bg-surface text-foreground border border-border hover:border-border-strong hover:bg-surface-elevated active:bg-background",
      ghost: "bg-transparent text-foreground hover:bg-surface active:bg-surface-elevated",
      destructive: "bg-danger text-white hover:brightness-110 active:brightness-95",
      outline: "bg-transparent border border-border text-foreground hover:border-border-strong hover:bg-surface active:bg-surface-elevated",
      link: "bg-transparent text-primary underline-offset-2 hover:underline",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-[4px] gap-1.5 h-8",
      md: "px-4 py-2 text-sm rounded-[4px] gap-2 h-10",
      lg: "px-6 py-2.5 text-base rounded-[4px] gap-2 h-12",
      icon: "p-2 rounded-[4px] h-10 w-10",
      "icon-sm": "p-1.5 rounded-[4px] h-8 w-8",
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
  },
);

Button.displayName = "Button";

export { Button };