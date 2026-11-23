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
            className="input-label"
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
            "w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-[4px] text-foreground placeholder:text-foreground-subtle",
            "transition-all duration-120 ease-[cubic-bezier(0.2,0,0,1)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-background",
            "font-variant-numeric: tabular-nums",
            "resize-y min-h-[100px]",
            error && "border-danger focus-visible:ring-danger",
            !error && "hover:border-primary/50",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-disabled={disabled}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="input-hint">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="input-error-text" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };