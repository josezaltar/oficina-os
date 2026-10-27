/*
  Validação com Zod (etapa 5).

  Regra de ouro: NUNCA confie no que vem do formulário. O HTML pode ter
  `required`, mas qualquer pessoa consegue enviar dados direto para o
  servidor. Por isso toda Server Action valida com estes esquemas.

  Bônus: `z.infer` gera o tipo TypeScript a partir do esquema, então o tipo
  e a validação nunca ficam diferentes.
*/
import { z } from "zod";
import { lerMoedaEmCentavos, lerNumeroBr, normalizarPlaca } from "./formato";

// Texto opcional: "" vira null (é assim que guardamos "vazio" no banco).
const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const textoObrigatorio = (mensagem: string) =>
  z.string().trim().min(1, { error: mensagem });

// Inteiro opcional vindo de um <input>: "" vira null.
const inteiroOpcional = (min: number, max: number, mensagem: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v.replace(/\./g, ""));
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: mensagem });
        return z.NEVER;
      }
      return n;
    });

// ---------------------------------------------------------------- clientes

const telefone = textoObrigatorio("Informe um telefone para contato.").pipe(
  z.string().regex(/^[\d\s()+-]{8,20}$/, { error: "Telefone inválido." }),
);

// CEP opcional: aceita "35500-000" ou "35500000" e guarda como 35500-000
const cep = textoOpcional.pipe(
  z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().length(8, { error: "CEP inválido. Use 00000-000." }))
    .transform((v) => `${v.slice(0, 5)}-${v.slice(5)}`)
    .nullable(),
);

export const esquemaCliente = z.object({
  nome: textoObrigatorio("Informe o nome do cliente.").pipe(
    z.string().max(120, { error: "Nome muito longo." }),
  ),
  telefone,
  email: textoOpcional.pipe(
    z.email({ error: "E-mail inválido." }).nullable(),
  ),
  documento: textoOpcional,
  cidade: textoOpcional,
  cep,
  numero: textoOpcional,
  observacoes: textoOpcional,
});

export type DadosCliente = z.infer<typeof esquemaCliente>;

// ---------------------------------------------------------------- veículos

const juntarEspacos = (texto: string) => texto.replace(/\s+/g, " ");

// Aceita placa antiga (ABC1234) e Mercosul (ABC1D23).
export const REGEX_PLACA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

export const esquemaVeiculo = z.object({
  clienteId: z.coerce
    .number({ error: "Escolha o cliente." })
    .int()
    .positive({ error: "Escolha o cliente." }),
  placa: z
    .string()
    .transform(normalizarPlaca)
    .pipe(
      z.string().regex(REGEX_PLACA, {
        error: "Placa inválida. Use o formato ABC1D23 ou ABC1234.",
      }),
    ),
  // " scania   R  450 " → "scania R 450": espaços repetidos não criam
  // uma marca "diferente" no catálogo
  marca: textoObrigatorio("Informe a marca.").transform(juntarEspacos),
  modelo: textoObrigatorio("Informe o modelo.").transform(juntarEspacos),
  tipo: textoOpcional,
  ano: inteiroOpcional(1950, 2100, "Ano inválido."),
});

export type DadosVeiculo = z.infer<typeof esquemaVeiculo>;

// --------------------------------------------------------- ordem de serviço

const placa = z
  .string()
  .transform(normalizarPlaca)
  .pipe(
    z.string().regex(REGEX_PLACA, {
      error: "Placa inválida. Use o formato ABC1D23 ou ABC1234.",
    }),
  );

/*
  Cabeçalho da OS, igual ao bloco de papel da oficina:
  NOME, DATA, CIDADE, MARCA, CEP, Nº, MODELO, TIPO, TEL e PLACA.
  Os itens (Unid., Descrição, Preço Unit.) são validados pelo esquemaItens.
*/
export const esquemaOrdem = z.object({
  placa,
  data: z.iso.date({ error: "Data inválida." }),
  nome: textoObrigatorio("Informe o nome do cliente."),
  telefone,
  cidade: textoOpcional,
  cep,
  numero: textoOpcional,
  marca: textoObrigatorio("Informe a marca.").transform(juntarEspacos),
  modelo: textoObrigatorio("Informe o modelo.").transform(juntarEspacos),
  // "tipoVeiculo" porque "tipo" já é o campo peça/serviço de cada item
  tipoVeiculo: textoOpcional,
});

export type DadosOrdem = z.infer<typeof esquemaOrdem>;

export const esquemaItem = z.object({
  tipo: z.enum(["peca", "servico"], { error: "Tipo inválido." }),
  // espaços repetidos não criam uma descrição "diferente" no catálogo
  descricao: textoObrigatorio("Descreva o serviço.").transform((t) => t.replace(/\s+/g, " ")),
  quantidade: z
    .string()
    .transform(lerNumeroBr)
    .pipe(
      z
        .number({ error: "Quantidade inválida." })
        .positive({ error: "A quantidade deve ser maior que zero." })
        .max(99_999, { error: "Quantidade muito alta." }),
    ),
  valorUnitarioCentavos: z
    .string()
    .transform(lerMoedaEmCentavos)
    .pipe(
      z
        .number({ error: "Valor inválido. Use o formato 1.234,56." })
        .int()
        .min(0, { error: "O valor não pode ser negativo." })
        .max(100_000_000, { error: "Valor muito alto." }),
    ),
});

// ------------------------------------------------- serviços (tabela de preços)

export const esquemaServico = z.object({
  referencia: textoOpcional.pipe(z.string().max(20, { error: "Código muito longo." }).nullable()),
  descricao: textoObrigatorio("Informe a descrição do serviço.").transform((t) => t.replace(/\s+/g, " ")),
  // Preço opcional: "" vira null (serviço sem preço fixo)
  preco: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const centavos = lerMoedaEmCentavos(v);
      if (Number.isNaN(centavos) || centavos < 0 || centavos > 100_000_000) {
        ctx.addIssue({ code: "custom", message: "Preço inválido. Use o formato 1.234,56." });
        return z.NEVER;
      }
      return centavos;
    }),
  categoria: textoOpcional.transform((v) => (v ? v.toUpperCase() : null)),
});

export type DadosServico = z.infer<typeof esquemaServico>;

// ------------------------------------------------------ contas a pagar

const dataObrigatoria = (mensagem: string) => z.iso.date({ error: mensagem });

// Data opcional de <input type="date">: "" vira null
const dataOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.iso.date({ error: "Data inválida." }).nullable());

const valorObrigatorio = z
  .string()
  .trim()
  .transform(lerMoedaEmCentavos)
  .pipe(
    z
      .number({ error: "Valor inválido. Use o formato 1.234,56." })
      .int()
      .positive({ error: "O valor precisa ser maior que zero." })
      .max(100_000_000, { error: "Valor muito alto." }),
  );

export const esquemaConta = z.object({
  descricao: textoObrigatorio("Descreva a conta (ex.: Nota de peças, Conta de luz)."),
  fornecedor: textoOpcional,
  categoria: textoOpcional.transform((v) => (v ? v.toUpperCase() : null)),
  valor: valorObrigatorio,
  vencimento: dataObrigatoria("Informe o vencimento."),
  pagaEm: dataOpcional,
  observacoes: textoOpcional,
});

export type DadosConta = z.infer<typeof esquemaConta>;

/** Pagamento da OS pelo cliente: vencimento combinado e/ou dia em que pagou. */
export const esquemaPagamentoOs = z.object({
  pagamentoVencimento: dataOpcional,
  pagaEm: dataOpcional,
});

export const esquemaItens = z
  .array(esquemaItem)
  .max(100, { error: "Máximo de 100 itens por OS." });

export type DadosItem = z.infer<typeof esquemaItem>;

// ---------------------------------------------------------------- usuários

export const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().pipe(
    z.email({ error: "Informe um e-mail válido." }),
  ),
  senha: z.string().min(1, { error: "Informe a senha." }),
});

export const esquemaNovoUsuario = z.object({
  nome: textoObrigatorio("Informe o nome."),
  email: z.string().trim().toLowerCase().pipe(
    z.email({ error: "Informe um e-mail válido." }),
  ),
  senha: z.string().min(8, { error: "A senha precisa ter 8 caracteres ou mais." }),
  papel: z.enum(["gerente", "atendente"], { error: "Escolha o papel." }),
});

/** Editar usuário: igual ao novo, mas a senha é opcional (vazia = não muda). */
export const esquemaEditarUsuario = esquemaNovoUsuario.extend({
  senha: z
    .string()
    .refine((s) => s === "" || s.length >= 8, { error: "A senha precisa ter 8 caracteres ou mais." }),
});
