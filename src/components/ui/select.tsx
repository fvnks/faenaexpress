"use client";

import { forwardRef } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      id,
      placeholder,
      options,
      disabled,
      required,
      ...props
    },
    ref,
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${id}-error` : undefined;
    const hintId = hint ? `${id}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          required={required}
          className={[
            "w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-md text-foreground",
            "transition-all duration-200",
            "focus-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "appearance-none bg-surface",
            "pr-10",
            error ? "border-danger focus:ring-danger/20" : "border-border hover:border-primary/50 focus:border-primary",
          ]
            .filter(Boolean)
            .join(" ")
          }
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-disabled={disabled}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {hint && !error && (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };