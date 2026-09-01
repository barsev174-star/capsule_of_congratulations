import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(rootDir, "vitest.setup.ts")],
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
      reporter: ["text", "html"],
      thresholds: {
        statements: 48,
        branches: 42,
        functions: 46,
        lines: 49
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src")
    }
  }
});
