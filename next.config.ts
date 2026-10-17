import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components está desactivado: esta app es dinámica y por usuario
  // (todas las páginas usan cookies/sesión). Si se activa, cada acceso a
  // cookies()/headers() debe ir dentro de <Suspense> o rompe el build.
  cacheComponents: false,
  experimental: {
    // La importación de XML DTE sube varios archivos o el ZIP del respaldo del
    // SII de una vez; el límite por defecto de 1 MB los rechazaba.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
