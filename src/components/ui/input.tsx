"use client";

import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      id,
      type = "text",
      placeholder,
      disabled,
      required,
      ...props
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={[
            "w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-md text-foreground placeholder:text-muted-foreground",
            "transition-all duration-200",
            "focus-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "placeholder:text-muted-foreground",
            error && "border-danger focus:ring-danger/20",
            !error && "border-border hover:border-primary/50 focus:border-primary",
          ]
            .filter(Boolean)
            .join(" ")
        }
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        aria-disabled={disabled}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export { Input };