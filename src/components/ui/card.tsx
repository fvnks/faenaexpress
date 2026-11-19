"use client";

import { forwardRef } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-surface border border-border rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-b border-border ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-lg font-semibold text-foreground ${className || ""}`}
        {...props}
      >
        {children}
      </h3>
    );
  }
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-muted-foreground text-sm mt-1 ${className || ""}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-6 ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-t border-border bg-surface/50 flex items-center gap-2 ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };