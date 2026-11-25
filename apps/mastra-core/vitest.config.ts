import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Testes de integração sobem processos (servidor MCP) e esperam timeouts de propósito
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
