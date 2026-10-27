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

export const ordensServico = pgTable("ordens_servico", {
  id: id(), // também serve como número da OS
  veiculoId: integer("veiculo_id")
    .notNull()
    .references(() => veiculos.id, { onDelete: "restrict" }),
  criadoPorId: integer("criado_por_id").references(() => usuarios.id, {
    onDelete: "set null",
  }),
  status: statusOsEnum("status").notNull().default("aberta"),
  descricaoProblema: text("descricao_problema").notNull(),
  kmEntrada: integer("km_entrada"),
  observacoes: text("observacoes"),
  // Dinheiro em centavos (inteiro) para não ter erro de arredondamento.
  totalCentavos: integer("total_centavos").notNull().default(0),
  abertaEm: timestamp("aberta_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  entregueEm: timestamp("entregue_em", { withTimezone: true }),
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
