"use client";

import { useEffect, useState, useRef } from "react";

/**
 * SectionReveal: anima una sección al entrar al viewport.
 *
 * Respeta prefers-reduced-motion: si el usuario ha desactivado el movimiento,
 * el contenido aparece inmediatamente sin animación. No hay bucles ni
 * animaciones que corran solas (MOTION 1).
 */
export function SectionReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Si el usuario prefiere reducir movimiento, mostrar inmediatamente.
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`
        relative ${className}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        transition-all duration-700 ease-out
        ${delay > 0 ? `transition-delay-[${delay}ms]` : ""}
      `}
    >
      {children}
    </div>
  );
}
