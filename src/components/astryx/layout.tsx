"use client";

import React from "react";

type StackBaseProps = React.ComponentPropsWithoutRef<"div"> & {
  children?: React.ReactNode;
  className?: string;
  space?: string;
  direction?: "col" | "row";
};

export function Stack({
  children,
  className,
  space = "4",
  direction = "col",
  ...props
}: StackBaseProps) {
  const gapMap: Record<string, string> = {
    "1": "gap-1",
    "2": "gap-2",
    "3": "gap-3",
    "4": "gap-4",
    "5": "gap-5",
    "6": "gap-6",
    "8": "gap-8",
    "10": "gap-10",
    "12": "gap-12",
    "16": "gap-16",
    "20": "gap-20",
    "24": "gap-24",
  };
  return (
    <div
      className={[
        `flex flex-${direction}`,
        gapMap[space] ?? "gap-4",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

type GridBaseProps = React.ComponentPropsWithoutRef<"div"> & {
  children?: React.ReactNode;
  className?: string;
  cols?: string;
  gap?: string;
};

export function Grid({
  children,
  className,
  cols = "1",
  gap = "4",
  ...props
}: GridBaseProps) {
  // Permite cols="1 lg:3" → genera grid-cols-1 lg:grid-cols-3
  const colsClasses = cols
    .split(" ")
    .map((c) => {
      if (c.includes(":")) {
        const [base, bp] = c.split(":");
        return `grid-cols-${base} ${bp}:grid-cols-${base}`;
      }
      return `grid-cols-${c}`;
    })
    .join(" ");

  return (
    <div
      className={[
        "grid",
        colsClasses,
        `gap-${gap}`,
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

type BoxBaseProps = React.ComponentPropsWithoutRef<"div"> & {
  children?: React.ReactNode;
  className?: string;
};

export function Box({ children, className, ...props }: BoxBaseProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
