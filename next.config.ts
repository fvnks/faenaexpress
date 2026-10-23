import type { NextConfig } from "next";

// Deshabilitar Turbopack en Windows para evitar panic de GenerateSourceMap
// con Next.js 16.4.2. Usar webpack en su lugar.
if (process.platform === "win32") {
  process.env.NEXT_DISABLE_TURBOPACK = "1";
}

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
  // Deshabilitar source maps en producción para evitar panic de Turbopack
  // en Windows con Next.js 16.4.
  productionBrowserSourceMaps: false,
  experimental: {
    // La importación de XML DTE sube varios archivos o el ZIP del respaldo del
    // SII de una vez; el límite por defecto de 1 MB los rechazaba.
    serverActions: {
      bodySizeLimit: "25mb",
    },
    // Aplica solo los upgrades de seguridad de Next.js, sin los de función.
    agentUpgrade: "security",
  },
};

export default nextConfig;
