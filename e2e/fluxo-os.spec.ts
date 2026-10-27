/*
  Fluxo principal da oficina, do começo ao fim (etapa 9):
  login → cliente → veículo → OS → itens → status até "Entregue".

  Pré-requisitos: banco com as migrations e o seed (conta demo).
    npm run db:migrate
    npm run db:seed -- --sim
*/
import { expect, test } from "@playwright/test";

// Dados únicos a cada execução, para o teste poder rodar várias vezes
const sufixo = Date.now().toString().slice(-6);
const letra = String.fromCharCode(65 + (Number(sufixo) % 26));
const placa = `TST${sufixo[0]}${letra}${sufixo.slice(-2)}`; // formato Mercosul
const nomeCliente = `Cliente E2E ${sufixo}`;

test("páginas internas exigem login", async ({ page }) => {
  await page.goto("/ordens");
  await expect(page).toHaveURL(/\/login\?de=%2Fordens/);
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
});

test("lança uma OS completa, do cadastro à entrega", async ({ page }) => {
  // 1. Login pela conta demo
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();

  // 2. Cadastra o cliente (testando a validação antes)
  await page.getByRole("link", { name: "Clientes" }).click();
  await page.getByRole("link", { name: "Novo cliente" }).click();
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByText("Informe o nome do cliente.")).toBeVisible();

  await page.getByLabel("Nome *").fill(nomeCliente);
  await page.getByLabel("Telefone *").fill("(37) 98888-0000");
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByRole("heading", { name: nomeCliente })).toBeVisible();

  // 3. Cadastra o veículo a partir da página do cliente
  await page.getByRole("link", { name: "+ Adicionar veículo" }).click();
  await page.getByLabel("Placa *").fill(placa);
  await page.getByLabel("Marca *").fill("Scania");
  await page.getByLabel("Modelo *").fill("G 420");
  await page.getByRole("button", { name: "Salvar veículo" }).click();
  await expect(page.getByRole("heading", { name: "Scania G 420" })).toBeVisible();

  // 4. Abre a OS
  await page.getByRole("link", { name: "Abrir OS" }).click();
  await page.getByLabel("Problema relatado pelo cliente *").fill("Motor esquentando");
  await page.getByLabel("Km na entrada").fill("350000");
  await page.getByRole("button", { name: "Abrir ordem de serviço" }).click();
  await expect(page.getByRole("heading", { name: /OS nº \d+/ })).toBeVisible();

  // 5. Lança um serviço e uma peça; a prévia do total aparece na hora
  await page.getByRole("button", { name: "+ Serviço" }).click();
  await page.getByLabel("Descrição do item 1").fill("Troca da bomba d'água");
  await page.getByLabel("Valor unitário do item 1").fill("250,00");

  await page.getByRole("button", { name: "+ Peça" }).click();
  await page.getByLabel("Descrição do item 2").fill("Aditivo de radiador (litro)");
  await page.getByLabel("Quantidade do item 2").fill("2,5");
  await page.getByLabel("Valor unitário do item 2").fill("45,90");

  await expect(page.getByTestId("total-previa")).toHaveText(/364,75/);
  await page.getByRole("button", { name: "Salvar itens" }).click();
  await expect(page.getByText("Itens salvos.")).toBeVisible();

  // 6. Avança o status até a entrega
  await page.getByRole("button", { name: "Iniciar serviço" }).click();
  await expect(page.getByText('Status alterado para "Em andamento".')).toBeVisible();

  await page.getByRole("button", { name: "Marcar como pronta" }).click();
  // Pronta: os itens viram só leitura e o total vem do SERVIDOR
  await expect(page.getByTestId("total-os")).toHaveText(/364,75/);

  await page.getByRole("button", { name: "Registrar entrega" }).click();
  await expect(page.getByText("OS finalizada. O status não muda mais.")).toBeVisible();

  // 7. A OS aparece na lista de entregues
  await page.goto(`/ordens?status=entregue&busca=${placa}`);
  await expect(page.getByRole("cell", { name: /TST/ })).toBeVisible();
});
