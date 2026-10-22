import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite levantar una segunda instancia de desarrollo en paralelo (con otra
  // variable de entorno y otro puerto). Sirve cuando el primer `next dev` quedó
  // vivo y hay que reiniciarlo para que recargue algo (por ejemplo, tras
  // regenerar el cliente de Prisma).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
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
    // Aplica solo los upgrades de seguridad de Next.js, sin los de función.
    agentUpgrade: "security",
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
