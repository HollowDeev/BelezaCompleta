import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 10000,
    fileParallelism: false, // Ensures sequential file execution to eliminate concurrency collisions
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

