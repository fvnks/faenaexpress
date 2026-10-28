"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingNavbar() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
          >
            Y
          </span>
          Yellow ERP
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="btn-liquid btn-liquid-secondary rounded-[10px] border px-4 py-1.5 text-sm font-medium"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
