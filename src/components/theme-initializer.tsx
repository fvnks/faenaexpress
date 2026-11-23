"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'high-contrast') {
        document.documentElement.classList.add('high-contrast');
      } else if (stored === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (!stored || stored === 'light' || stored === 'system') {
        // Default to light mode; if system prefers dark, use high-contrast as the "dark" option
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('high-contrast');
          localStorage.setItem('theme', 'high-contrast');
        }
      }
    } catch {
      // Sin localStorage el tema claro por defecto se mantiene.
    }
  }, []);

  return null;
}