/*
  Seed: preenche o banco com dados de exemplo (TODOS inventados).

  Uso:  npm run db:seed -- --sim

  ⚠️ ATENÇÃO: este script APAGA tudo antes de inserir. Nunca rode no banco de
  produção da oficina. O `--sim` existe para ninguém rodar sem querer.

  Ele não importa src/db/index.ts porque aquele arquivo tem `server-only`,
  que só funciona dentro do Next. Aqui é um script Node comum, então ele
  cria a própria conexão.
*/
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { calcularTotalCentavos } from "../lib/regras-os";
import { gerarHash } from "../lib/senha";
import * as schema from "./schema";

const {
  usuarios,
  clientes,
  veiculos,
  ordensServico,
  itensOs,
} = schema;

// Senha de todas as contas de exemplo. É pública de propósito (conta demo).
export const SENHA_DEMO = "demo1234";

const diasAtras = (dias: number) => new Date(Date.now() - dias * 86_400_000);

async function main() {
  if (!process.argv.includes("--sim")) {
    console.log(
      "Este script APAGA todos os dados e insere dados de exemplo.\n" +
        "Para confirmar, rode: npm run db:seed -- --sim",
    );
    process.exit(1);
  }

  const conexao = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(conexao, { schema });

  console.log("Limpando tabelas...");
  // RESTART IDENTITY zera os contadores de id (a OS volta a começar em 1).
  await db.execute(
    sql`TRUNCATE itens_os, ordens_servico, veiculos, clientes, usuarios RESTART IDENTITY CASCADE`,
  );

  console.log("Criando usuários...");
  const senhaHash = await gerarHash(SENHA_DEMO);
  const [gerente, atendente] = await db
    .insert(usuarios)
    .values([
      {
        nome: "Gerente Demo",
        email: "gerente@oficina.dev",
        senhaHash,
        papel: "gerente",
      },
      {
        nome: "Atendente Demo",
        email: "atendente@oficina.dev",
        senhaHash,
        papel: "atendente",
      },
    ])
    .returning();

  console.log("Criando clientes...");
  const listaClientes = await db
    .insert(clientes)
    .values([
      { nome: "Transportes Serra Azul Ltda", telefone: "(37) 99900-0001", documento: "00.000.000/0001-01", email: "frota@serraazul.exemplo" },
      { nome: "Agropecuária Vale Verde", telefone: "(37) 99900-0002", documento: "00.000.000/0001-02" },
      { nome: "Carlos Henrique Moreira", telefone: "(37) 99900-0003", documento: "000.000.000-03" },
      { nome: "Mineração Pedra Branca", telefone: "(37) 99900-0004", email: "manutencao@pedrabranca.exemplo" },
      { nome: "Ana Paula Rezende", telefone: "(37) 99900-0005" },
      { nome: "Laticínios Boa Vista", telefone: "(37) 99900-0006", observacoes: "Pagamento sempre no boleto, 28 dias." },
      { nome: "Roberto Alves Teixeira", telefone: "(37) 99900-0007" },
      { nome: "Construtora Horizonte", telefone: "(37) 99900-0008", documento: "00.000.000/0001-08" },
    ])
    .returning();

  const c = (i: number) => listaClientes[i].id;

  console.log("Criando veículos...");
  const listaVeiculos = await db
    .insert(veiculos)
    .values([
      { clienteId: c(0), placa: "SRA1A01", marca: "Scania", modelo: "R 450", ano: 2019 },
      { clienteId: c(0), placa: "SRA2B02", marca: "Volvo", modelo: "FH 540", ano: 2021 },
      { clienteId: c(1), placa: "VLV3C03", marca: "Mercedes-Benz", modelo: "Atego 2426", ano: 2017 },
      { clienteId: c(2), placa: "CHM4D04", marca: "Toyota", modelo: "Hilux SRV", ano: 2020 },
      { clienteId: c(3), placa: "MPB5E05", marca: "Volkswagen", modelo: "Constellation 24.280", ano: 2018 },
      { clienteId: c(3), placa: "MPB6F06", marca: "Iveco", modelo: "Tector 240E28", ano: 2016 },
      { clienteId: c(4), placa: "APR7G07", marca: "Ford", modelo: "Ranger XLS", ano: 2022 },
      { clienteId: c(5), placa: "LBV8H08", marca: "Ford", modelo: "Cargo 2429", ano: 2015 },
      { clienteId: c(6), placa: "RAT9J09", marca: "Mitsubishi", modelo: "L200 Triton", ano: 2019 },
      { clienteId: c(7), placa: "CHZ0K10", marca: "Mercedes-Benz", modelo: "Sprinter 416", ano: 2021 },
    ])
    .returning();

  const v = (i: number) => listaVeiculos[i].id;

  console.log("Criando ordens de serviço...");
  type Item = Omit<typeof itensOs.$inferInsert, "ordemId"> & { quantidade: number };
  const ordens: {
    veiculoId: number;
    status: schema.StatusOs;
    descricaoProblema: string;
    kmEntrada: number;
    abertaHaDias: number;
    entregueHaDias?: number;
    itens: Item[];
  }[] = [
    {
      veiculoId: v(0), status: "entregue", kmEntrada: 412_300, abertaHaDias: 40, entregueHaDias: 37,
      descricaoProblema: "Revisão dos 400 mil km",
      itens: [
        { tipo: "servico", descricao: "Troca de óleo do motor", quantidade: 1, valorUnitarioCentavos: 18000 },
        { tipo: "peca", descricao: "Óleo 15W40 (litro)", quantidade: 32, valorUnitarioCentavos: 3290 },
        { tipo: "peca", descricao: "Filtro de óleo", quantidade: 2, valorUnitarioCentavos: 14500 },
        { tipo: "servico", descricao: "Regulagem de válvulas", quantidade: 1, valorUnitarioCentavos: 65000 },
      ],
    },
    {
      veiculoId: v(2), status: "entregue", kmEntrada: 288_100, abertaHaDias: 12, entregueHaDias: 3,
      descricaoProblema: "Motor falhando e fumaça preta",
      itens: [
        { tipo: "servico", descricao: "Limpeza de bicos injetores", quantidade: 1, valorUnitarioCentavos: 48000 },
        { tipo: "peca", descricao: "Bico injetor", quantidade: 2, valorUnitarioCentavos: 112000 },
        { tipo: "peca", descricao: "Filtro de combustível", quantidade: 1, valorUnitarioCentavos: 9800 },
      ],
    },
    {
      veiculoId: v(3), status: "entregue", kmEntrada: 98_450, abertaHaDias: 6, entregueHaDias: 2,
      descricaoProblema: "Revisão preventiva",
      itens: [
        { tipo: "servico", descricao: "Troca de óleo do motor", quantidade: 1, valorUnitarioCentavos: 9000 },
        { tipo: "peca", descricao: "Óleo 5W30 (litro)", quantidade: 7.5, valorUnitarioCentavos: 4590 },
        { tipo: "peca", descricao: "Filtro de óleo", quantidade: 1, valorUnitarioCentavos: 6200 },
        { tipo: "peca", descricao: "Filtro de ar", quantidade: 1, valorUnitarioCentavos: 11900 },
      ],
    },
    {
      veiculoId: v(4), status: "pronta", kmEntrada: 356_900, abertaHaDias: 5,
      descricaoProblema: "Embreagem patinando",
      itens: [
        { tipo: "servico", descricao: "Troca de embreagem", quantidade: 1, valorUnitarioCentavos: 120000 },
        { tipo: "peca", descricao: "Kit de embreagem", quantidade: 1, valorUnitarioCentavos: 389000 },
      ],
    },
    {
      veiculoId: v(1), status: "em_andamento", kmEntrada: 201_750, abertaHaDias: 3,
      descricaoProblema: "Luz de injeção acesa, perda de potência",
      itens: [
        { tipo: "servico", descricao: "Diagnóstico eletrônico (scanner)", quantidade: 1, valorUnitarioCentavos: 25000 },
        { tipo: "servico", descricao: "Limpeza de bicos injetores", quantidade: 1, valorUnitarioCentavos: 48000 },
      ],
    },
    {
      veiculoId: v(7), status: "em_andamento", kmEntrada: 503_200, abertaHaDias: 2,
      descricaoProblema: "Barulho na suspensão dianteira",
      itens: [
        { tipo: "servico", descricao: "Troca de buchas da suspensão", quantidade: 1, valorUnitarioCentavos: 38000 },
        { tipo: "peca", descricao: "Bucha do feixe de mola", quantidade: 4, valorUnitarioCentavos: 8700 },
      ],
    },
    {
      veiculoId: v(6), status: "aberta", kmEntrada: 45_300, abertaHaDias: 1,
      descricaoProblema: "Ar-condicionado não gela",
      itens: [],
    },
    {
      veiculoId: v(9), status: "aberta", kmEntrada: 133_000, abertaHaDias: 0,
      descricaoProblema: "Revisão preventiva e alinhamento",
      itens: [
        { tipo: "servico", descricao: "Troca de óleo do motor", quantidade: 1, valorUnitarioCentavos: 12000 },
        { tipo: "servico", descricao: "Alinhamento e balanceamento", quantidade: 1, valorUnitarioCentavos: 22000 },
      ],
    },
  ];

  for (const o of ordens) {
    const [ordem] = await db
      .insert(ordensServico)
      .values({
        veiculoId: o.veiculoId,
        criadoPorId: o.abertaHaDias % 2 === 0 ? gerente.id : atendente.id,
        status: o.status,
        descricaoProblema: o.descricaoProblema,
        kmEntrada: o.kmEntrada,
        totalCentavos: calcularTotalCentavos(o.itens),
        abertaEm: diasAtras(o.abertaHaDias),
        entregueEm:
          o.entregueHaDias === undefined ? null : diasAtras(o.entregueHaDias),
      })
      .returning();

    if (o.itens.length > 0) {
      await db
        .insert(itensOs)
        .values(o.itens.map((item) => ({ ...item, ordemId: ordem.id })));
    }
  }

  console.log("Pronto! Login: gerente@oficina.dev / " + SENHA_DEMO);
  await conexao.end();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
