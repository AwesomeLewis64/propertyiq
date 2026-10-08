import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  worker: { format: "es" },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/finance/**/*.ts"],
      exclude: ["src/finance/**/*.test.ts"],
      reporter: ["text", "html", "json-summary"],
      thresholds: { statements: 90, lines: 90, functions: 90, branches: 80 },
    },
  },
});
