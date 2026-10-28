"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          // eslint-disable-next-line no-console
          console.log("Service Worker registrado:", registration.scope);
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error("Error registrando Service Worker:", error);
        });
    }
  }, []);

  return null;
}
