/*
  Esquema do banco (etapa 3), escrito em TypeScript com o Drizzle ORM.

  Este arquivo é a "fonte da verdade" das tabelas. A partir dele:
  - `npm run db:generate` cria o SQL da migration na pasta /drizzle;
  - `npm run db:migrate` aplica esse SQL no banco (Neon ou local);
  - o TypeScript passa a saber o tipo de cada coluna nas consultas.

  O diagrama e as decisões estão em docs/modelo-de-dados.md.
*/
import { relations, sql } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums viram tipos do PostgreSQL: o banco recusa qualquer valor fora da lista.
export const papelEnum = pgEnum("papel", ["gerente", "atendente"]);
export const statusOsEnum = pgEnum("status_os", [
  "aberta",
  "em_andamento",
  "pronta",
  "entregue",
]);
export const tipoItemEnum = pgEnum("tipo_item", ["peca", "servico"]);

// `id` com identity: o próprio banco gera 1, 2, 3... (equivale ao antigo serial)
const id = () => integer("id").primaryKey().generatedAlwaysAsIdentity();
const criadoEm = () =>
  timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();

export const usuarios = pgTable("usuarios", {
  id: id(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  // Nunca guardamos a senha, só o hash (bcrypt). Veja src/lib/senha.ts.
  senhaHash: text("senha_hash").notNull(),
  papel: papelEnum("papel").notNull().default("atendente"),
  criadoEm: criadoEm(),
});

export const clientes = pgTable("clientes", {
  id: id(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  documento: text("documento"), // CPF ou CNPJ, opcional
  // Endereço como no bloco de OS da oficina: cidade, CEP e número
  cidade: text("cidade"),
  cep: text("cep"),
  numero: text("numero"),
  observacoes: text("observacoes"),
  criadoEm: criadoEm(),
});

export const veiculos = pgTable("veiculos", {
  id: id(),
  // Chave estrangeira: o veículo pertence a um cliente.
  // onDelete "restrict": o banco impede excluir um cliente que tem veículos.
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "restrict" }),
  placa: text("placa").notNull().unique(),
  marca: text("marca").notNull(),
  modelo: text("modelo").notNull(),
  tipo: text("tipo"), // ex.: Cavalo mecânico, Toco, Truck, Utilitário
  ano: integer("ano"),
  criadoEm: criadoEm(),
});

/*
  Catálogo de marca/modelo/ano: a "memória" do formulário de veículo.
  Cada veículo salvo registra aqui a sua combinação, e o formulário passa
  a sugerir o que já foi digitado antes.

  Fica numa tabela própria (e não só nos veículos) para as sugestões
  continuarem existindo mesmo se o veículo for excluído.

  O índice único usa lower(): "Scania", "SCANIA" e "scania" contam como a
  MESMA marca. coalesce(ano, 0) porque no SQL um NULL nunca é "igual" a
  outro NULL, e sem isso daria para repetir "Scania R 450" sem ano.
*/
export const catalogoVeiculos = pgTable(
  "catalogo_veiculos",
  {
    id: id(),
    marca: text("marca").notNull(),
    modelo: text("modelo").notNull(),
    ano: integer("ano"),
  },
  (t) => [
    uniqueIndex("catalogo_veiculos_unico").on(
      sql`lower(${t.marca})`,
      sql`lower(${t.modelo})`,
      sql`coalesce(${t.ano}, 0)`,
    ),
  ],
);

/*
  Cadastro de serviços da oficina (a "tabela de preços").
  - Cadastrados na área Serviços, ou importados da tabela antiga
    (npm run db:importar-servicos).
  - Uma descrição nova digitada numa OS também entra aqui, com o preço usado.
  Na OS, escolher a descrição preenche o preço unitário.

  lower() no índice único: "Troca de óleo" e "TROCA DE ÓLEO" são a mesma
  descrição, então não existem duas iguais.
*/
export const catalogoServicos = pgTable(
  "catalogo_servicos",
  {
    id: id(),
    // Código do sistema antigo (ex.: "00145"); opcional e único
    referencia: text("referencia").unique(),
    descricao: text("descricao").notNull(),
    // Preço de tabela em centavos; null = sem preço definido
    precoCentavos: integer("preco_centavos"),
    categoria: text("categoria"), // ex.: MOTOR, CAIXA, RODA
  },
  (t) => [uniqueIndex("catalogo_servicos_unico").on(sql`lower(${t.descricao})`)],
);

export const ordensServico = pgTable("ordens_servico", {
  id: id(), // também serve como número da OS
  veiculoId: integer("veiculo_id")
    .notNull()
    .references(() => veiculos.id, { onDelete: "restrict" }),
  criadoPorId: integer("criado_por_id").references(() => usuarios.id, {
    onDelete: "set null",
  }),
  status: statusOsEnum("status").notNull().default("aberta"),
  /*
    Cópia dos dados do cabeçalho do bloco, do jeito que foram escritos NESTA OS.
    Se o atendente mudar o telefone só para esta OS, o cadastro do cliente
    continua como estava, e a OS (e a impressão) mostra o que foi digitado.
    É o mesmo que acontece com o papel: a folha guarda o que estava escrito.
  */
  clienteNome: text("cliente_nome"),
  clienteTelefone: text("cliente_telefone"),
  clienteCidade: text("cliente_cidade"),
  clienteCep: text("cliente_cep"),
  clienteNumero: text("cliente_numero"),
  veiculoPlaca: text("veiculo_placa"),
  veiculoMarca: text("veiculo_marca"),
  veiculoModelo: text("veiculo_modelo"),
  veiculoTipo: text("veiculo_tipo"),
  // Opcional: o bloco de papel não tem esse campo
  descricaoProblema: text("descricao_problema"),
  /*
    Pagamento da OS pelo cliente (controle de contas a receber).
    `date` (só dia, sem hora) com mode "string": vem como "2026-10-27",
    sem confusão de fuso horário.
    - pagamentoVencimento: dia combinado para o cliente pagar (opcional)
    - pagaEm: dia em que o cliente pagou; null = ainda não pagou
  */
  pagamentoVencimento: date("pagamento_vencimento", { mode: "string" }),
  pagaEm: date("paga_em", { mode: "string" }),
  kmEntrada: integer("km_entrada"),
  observacoes: text("observacoes"),
  // Dinheiro em centavos (inteiro) para não ter erro de arredondamento.
  totalCentavos: integer("total_centavos").notNull().default(0),
  abertaEm: timestamp("aberta_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  entregueEm: timestamp("entregue_em", { withTimezone: true }),
});

/*
  Contas a pagar da oficina: notas de fornecedor, água, luz, aluguel...
  Quando é paga, `pagaEm` recebe a data e a conta sai da lista de pendentes
  (e do alerta). O relatório usa `pagaEm` para saber em que mês saiu o dinheiro.
*/
export const contasPagar = pgTable("contas_pagar", {
  id: id(),
  descricao: text("descricao").notNull(),
  fornecedor: text("fornecedor"),
  categoria: text("categoria"), // ex.: PEÇAS, ÁGUA, LUZ, ALUGUEL
  valorCentavos: integer("valor_centavos").notNull(),
  vencimento: date("vencimento", { mode: "string" }).notNull(),
  pagaEm: date("paga_em", { mode: "string" }),
  observacoes: text("observacoes"),
  criadoEm: criadoEm(),
});

export const itensOs = pgTable("itens_os", {
  id: id(),
  // cascade: excluir a OS apaga os itens dela junto.
  ordemId: integer("ordem_id")
    .notNull()
    .references(() => ordensServico.id, { onDelete: "cascade" }),
  tipo: tipoItemEnum("tipo").notNull(),
  descricao: text("descricao").notNull(),
  // numeric aceita quantidade quebrada (ex.: 2,5 litros de óleo).
  // mode "number" faz o Drizzle devolver number em vez de string.
  quantidade: numeric("quantidade", { precision: 10, scale: 2, mode: "number" })
    .notNull()
    .default(1),
  valorUnitarioCentavos: integer("valor_unitario_centavos").notNull(),
});

/*
  `relations` NÃO cria nada no banco: só ensina o Drizzle a montar consultas
  aninhadas, como "a OS com o veículo, o cliente do veículo e os itens":
    db.query.ordensServico.findFirst({ with: { veiculo: { with: { cliente: true } }, itens: true } })
*/
export const clientesRelations = relations(clientes, ({ many }) => ({
  veiculos: many(veiculos),
}));

export const veiculosRelations = relations(veiculos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [veiculos.clienteId],
    references: [clientes.id],
  }),
  ordens: many(ordensServico),
}));

export const ordensServicoRelations = relations(
  ordensServico,
  ({ one, many }) => ({
    veiculo: one(veiculos, {
      fields: [ordensServico.veiculoId],
      references: [veiculos.id],
    }),
    criadoPor: one(usuarios, {
      fields: [ordensServico.criadoPorId],
      references: [usuarios.id],
    }),
    itens: many(itensOs),
  }),
);

export const itensOsRelations = relations(itensOs, ({ one }) => ({
  ordem: one(ordensServico, {
    fields: [itensOs.ordemId],
    references: [ordensServico.id],
  }),
}));

// Tipos derivados do esquema, usados no resto do código.
export type Papel = (typeof papelEnum.enumValues)[number];
export type StatusOs = (typeof statusOsEnum.enumValues)[number];
export type TipoItem = (typeof tipoItemEnum.enumValues)[number];
