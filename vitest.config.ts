import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } })],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/tests/setup.ts",
  },
});
