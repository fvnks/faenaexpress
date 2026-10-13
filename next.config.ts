import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components está desactivado: esta app es dinámica y por usuario
  // (todas las páginas usan cookies/sesión). Si se activa, cada acceso a
  // cookies()/headers() debe ir dentro de <Suspense> o rompe el build.
  cacheComponents: false,
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
