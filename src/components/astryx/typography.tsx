"use client";

import React from "react";

type TextBaseProps = React.ComponentPropsWithoutRef<"p"> & {
  children?: React.ReactNode;
  className?: string;
};

export function Text({
  children,
  className,
  as = "p",
  ...props
}: TextBaseProps & { as?: "p" | "span" | "div" }) {
  const Tag: keyof React.JSX.IntrinsicElements =
    as === "span" ? "span" : as === "div" ? "div" : "p";
  return (
    <Tag
      className={[
        "text-base leading-relaxed text-foreground",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Heading({
  children,
  className,
  level = 1,
  ...props
}: TextBaseProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const sizeMap: Record<number, string> = {
    1: "text-4xl lg:text-6xl",
    2: "text-3xl lg:text-4xl",
    3: "text-2xl lg:text-3xl",
    4: "text-xl lg:text-2xl",
    5: "text-lg lg:text-xl",
    6: "text-base lg:text-lg",
  };
  const Tag: keyof React.JSX.IntrinsicElements = `h${level}`;
  return (
    <Tag
      className={[
        "font-bold text-foreground leading-tight tracking-tight mb-4",
        sizeMap[level],
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Label({
  children,
  className,
  htmlFor,
  ...props
}: React.ComponentPropsWithoutRef<"label"> & { className?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={[
        "text-xs font-medium tracking-tight uppercase text-muted-foreground mb-1 block",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </label>
  );
}

export function Caption({
  children,
  className,
  ...props
}: TextBaseProps) {
  return (
    <p
      className={[
        "text-[11px] text-muted-foreground leading-relaxed",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </p>
  );
}
