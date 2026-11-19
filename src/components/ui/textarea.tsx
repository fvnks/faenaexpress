"use client";

import { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      hint,
      id,
      placeholder,
      disabled,
      required,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={[
            "w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-md text-foreground placeholder:text-muted-foreground",
            "transition-all duration-200",
            "focus-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "placeholder:text-muted-foreground",
            error ? "border-danger focus:ring-danger/20" : "border-border hover:border-primary/50 focus:border-primary",
          ]
            .filter(Boolean)
            .join(" ")
          }
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          aria-disabled={disabled}
          {...props}
        />
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };