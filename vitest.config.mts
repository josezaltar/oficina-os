import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/*
  Testes de unidade (etapa 9): testam as REGRAS (funções puras), que não
  precisam de navegador nem de banco. Por isso o ambiente é "node".
  O fluxo completo, no navegador, é testado pelo Playwright (pasta e2e/).
*/
export default defineConfig({
  resolve: {
    // Mesmo atalho do tsconfig: "@/lib/x" → "src/lib/x"
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
