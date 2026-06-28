import { defineConfig } from "vitest/config";
import path from "path";

// Config dedicada do Vitest (não puxa o pipeline pesado do Vite app).
// Ambiente jsdom para testar código que usa localStorage/window (ex.: userRole).
export default defineConfig({
  resolve: {
    alias: {
      "@dheiver2/ui": path.resolve(__dirname, "./src/vendor/dheiver2-ui"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    // jsdom em about:blank tem origem opaca → localStorage indisponível.
    // Uma URL real dá origem válida e habilita o localStorage.
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
  },
});
