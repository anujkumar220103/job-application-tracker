import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    // The controller/lib unit tests are framework-agnostic and run here.
    // The legacy Next.js route-handler tests are preserved for reference but
    // excluded, since those handlers were replaced by Express routes.
    exclude: ["**/node_modules/**", "**/dist/**", "_legacy_next_route_tests/**"],
  },
});
