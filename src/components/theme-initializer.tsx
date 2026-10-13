"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    try {
      const s = localStorage.getItem('theme');
      const d = s === 'dark' || ((!s || s === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (d) {
        document.documentElement.classList.add('dark');
      }
    } catch {
      // Sin localStorage el tema claro por defecto se mantiene.
    }
  }, []);

  return null;
}