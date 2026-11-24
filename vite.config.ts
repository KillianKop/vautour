import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths: the build works from any sub-path (GitHub Pages, a phone on the LAN, a zip).
  base: "./",
  build: { target: "es2020", outDir: "dist", assetsInlineLimit: 0 },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
