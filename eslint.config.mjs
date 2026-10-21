import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Directorios de desarrollo alternativos (instancia paralela con
    // NEXT_DIST_DIR): no son código fuente.
    ".next-dev*/**",
    // Carpeta de build propia, para no pelear con el dev server del 3000.
    ".next-build/**",
  ]),
]);

export default eslintConfig;
