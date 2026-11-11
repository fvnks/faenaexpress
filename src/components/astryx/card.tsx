"use client";

import React from "react";

/**
 * Tarjeta compuesta al estilo Astryx.
 * Partes independientes: Card, Card.Header, Card.Title, Card.Description,
 * Card.Content, Card.Footer.
 */
type CardBaseProps = React.ComponentPropsWithoutRef<"div"> & {
  children?: React.ReactNode;
  className?: string;
};

function Card({ children, className, ...props }: CardBaseProps) {
  return (
    <div
      className={[
        "rounded-card border border-border bg-surface shadow-sm",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = ({ children, className, ...props }: CardBaseProps) => (
  <div
    className={[
      "flex flex-col space-y-1.5 px-6 py-6",
      className,
    ].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);

Card.Title = ({ children, className, ...props }: CardBaseProps) => (
  <h3
    className={[
      "text-2xl font-bold text-foreground tracking-tight",
      className,
    ].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </h3>
);

Card.Description = ({ children, className, ...props }: CardBaseProps) => (
  <p
    className={[
      "text-sm text-muted-foreground",
      className,
    ].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </p>
);

Card.Content = ({ children, className, ...props }: CardBaseProps) => (
  <div
    className={[
      "px-6 py-4",
      className,
    ].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);

Card.Footer = ({ children, className, ...props }: CardBaseProps) => (
  <div
    className={[
      "flex items-center gap-2 px-6 py-4 border-t border-border",
      className,
    ].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);

export default Card;
export type { CardBaseProps as CardProps };
