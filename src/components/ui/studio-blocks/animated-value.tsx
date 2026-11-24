"use client";

import { useEffect, useState } from "react";

/**
 * Valor formateado que cuenta desde 0 hasta el número real al montar.
 * Se desactiva por completo con prefers-reduced-motion.
 */
export function AnimatedValue({ value, formatted }: { value: number; formatted: string }) {
  const [display, setDisplay] = useState(formatted);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setDisplay(formatted);
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setDisplay(formatted);
      return;
    }

    // Extrae el prefijo/sufijo del formato para animar solo los dígitos.
    const match = formatted.match(/^([^\d-]*)([\d.,]+)([^\d-]*)$/);
    if (!match) {
      setDisplay(formatted);
      return;
    }
    const [, prefix, digits, suffix] = match;
    const decimals = (digits.split(".")[1] ?? "").length;
    const start = performance.now();
    const duration = 900;
    let raf = 0;

    const render = (current: number) => {
      const fixed = current.toLocaleString("es-CL", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix}${fixed}${suffix}`;
    };

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(render(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplay(formatted);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, formatted]);

  return <>{display}</>;
}
