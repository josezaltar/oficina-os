/*
  Fluxo principal da oficina, do começo ao fim (etapa 9), com a OS no
  formato do bloco de papel:
  1. placa nova → o bloco cadastra cliente e veículo ao abrir a OS;
  2. a mesma placa de novo → o bloco é preenchido sozinho.

  Pré-requisitos: banco com as migrations e um usuário gerente
  (o seed cria a conta demo).
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

test("lança uma OS no bloco, do cadastro à entrega, e reconhece a placa depois", async ({ page }) => {
  // Login pela conta demo
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();

  // ---------------------------------------------------------- placa nova
  await page.getByRole("link", { name: "Nova OS" }).click();
  await expect(page.getByRole("heading", { name: "Nova ordem de serviço" })).toBeVisible();

  // Sem preencher nada: o servidor devolve os erros
  await page.getByRole("button", { name: "Abrir ordem de serviço" }).click();
  await expect(page.getByText("Informe o nome do cliente.")).toBeVisible();

  await page.getByLabel("Placa *").fill(placa);
  await expect(page.getByText("Placa nova")).toBeVisible();

  await page.getByLabel("Nome *").fill(nomeCliente);
  // O erro do nome some assim que o campo é corrigido
  await expect(page.getByText("Informe o nome do cliente.")).toBeHidden();
  await page.getByLabel("Tel *").fill("(37) 98888-0000");
  await page.getByLabel("Cidade").fill("Divinópolis");
  await page.getByLabel("Marca *").fill("Volkswagen");
  await page.getByLabel("Modelo *").fill("Constellation 24.280");
  await page.getByLabel("Tipo", { exact: true }).fill("Truck");

  // Itens: dois serviços; a 3ª linha fica em branco e é ignorada
  await page.getByLabel("Descrição do item 1").fill("Troca da bomba d'água");
  await page.getByLabel("Valor unitário do item 1").fill("250,00");
  await page.getByLabel("Quantidade do item 2").fill("2,5");
  await page.getByLabel("Descrição do item 2").fill("Aditivo de radiador (litro)");
  await page.getByLabel("Valor unitário do item 2").fill("45,90");

  await expect(page.getByTestId("total-previa")).toHaveText(/364,75/);
  await page.getByRole("button", { name: "Abrir ordem de serviço" }).click();
  await expect(page.getByRole("heading", { name: /OS nº \d+/ })).toBeVisible();
  const urlOs = page.url();

  // ---------------------------------------------------------- status
  await page.getByRole("button", { name: "Iniciar serviço" }).click();
  await expect(page.getByText('Status alterado para "Em andamento".')).toBeVisible();

  await page.getByRole("button", { name: "Marcar como pronta" }).click();
  // Pronta: os itens viram só leitura e o total vem do SERVIDOR
  await expect(page.getByTestId("total-os")).toHaveText(/364,75/);

  await page.getByRole("button", { name: "Registrar entrega" }).click();
  await expect(page.getByText("OS finalizada. O status não muda mais.")).toBeVisible();

  // A impressão sai no formato do bloco, com o total
  await page.goto(urlOs.replace("/ordens/", "/imprimir/os/"));
  // Padrão: 2 vias na mesma folha, cada uma com o total
  await expect(page.getByTestId("via")).toHaveCount(2);
  await expect(page.getByTestId("total-impresso").first()).toHaveText(/364,75/);

  // ---------------------------------------------------------- mesma placa
  await page.goto("/ordens/nova");
  await page.getByLabel("Placa *").fill(placa);
  await expect(page.getByText("Veículo já cadastrado")).toBeVisible();
  await expect(page.getByLabel("Nome *")).toHaveValue(nomeCliente);
  await expect(page.getByLabel("Tel *")).toHaveValue("(37) 98888-0000");
  await expect(page.getByLabel("Modelo *")).toHaveValue("Constellation 24.280");

  // O cliente e o veículo foram cadastrados pela primeira OS
  await page.goto(`/veiculos?busca=${placa}`);
  await expect(page.getByRole("cell", { name: nomeCliente })).toBeVisible();
});
