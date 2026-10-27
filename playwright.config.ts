import { defineConfig, devices } from "@playwright/test";

/*
  Teste de ponta a ponta (E2E, etapa 9): o Playwright abre um navegador
  de verdade e usa o sistema como uma pessoa usaria.

  Rode com: npm run test:e2e
  Na primeira vez, instale o navegador: npx playwright install chromium

  ⚠️ O teste CRIA dados (cliente, veículo, OS) no banco do seu .env.
  Use o banco de desenvolvimento/demo, nunca o da oficina.
*/
const PORTA = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: "retain-on-failure", // em caso de falha, grava um "filme" para depurar
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Testa a versão de produção (build), igual à que vai para a Vercel
    command: `npm run build && npm run start -- -p ${PORTA}`,
    url: `http://localhost:${PORTA}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // O teste entra pelo botão de demonstração
    env: { DEMO_MODE: "true" },
  },
});
