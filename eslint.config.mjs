import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Application code logs only through src/lib/logger.ts (docs/operations.md, Logging standard).
  { files: ["src/**/*.{ts,tsx}"], ignores: ["src/lib/logger.ts"], rules: { "no-console": "error" } },
  globalIgnores([".next/**", "next-env.d.ts", "playwright-report/**", "test-results/**", "sourcemaps/**"]),
]);
