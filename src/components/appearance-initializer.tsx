"use client";

import { useLayoutEffect } from "react";

/**
 * Respaldo del script inline de `layout.tsx`: en algunas navegaciones el <script>
 * del head puede no ejecutarse (Next lo reinserta tras la hydratación). Esto
 * corre antes del primer pintado y deja el DOM con la misma decisión.
 */
export function AppearanceInitializer() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let mode = "auto";
    let palette = "cobre";
    try {
      mode = localStorage.getItem("theme") || "auto";
      palette = localStorage.getItem("palette") || "cobre";
    } catch {
      // Sin localStorage se usa el default.
    }
    if (!["auto", "light", "dark", "high-contrast"].includes(mode)) mode = "auto";
    if (!["cobre", "arena", "bosque", "acero", "vino"].includes(palette)) palette = "cobre";

    const resuelta = mode === "auto" ? (new Date().getHours() >= 7 && new Date().getHours() < 19 ? "light" : "dark") : mode;
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-palette", palette);
    root.classList.remove("light", "dark", "high-contrast");
    if (resuelta !== "light") root.classList.add(resuelta);
  }, []);

  return null;
}
