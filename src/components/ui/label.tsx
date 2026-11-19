"use client";

import { forwardRef } from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-sm font-medium text-foreground ${className || ""}`}
        {...props}
      >
        {children}
        {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
      </label>
    );
  }
);

Label.displayName = "Label";

export { Label };