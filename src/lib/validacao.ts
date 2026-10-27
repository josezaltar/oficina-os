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

export const esquemaCliente = z.object({
  nome: textoObrigatorio("Informe o nome do cliente.").pipe(
    z.string().max(120, { error: "Nome muito longo." }),
  ),
  telefone: textoObrigatorio("Informe um telefone para contato.").pipe(
    z.string().regex(/^[\d\s()+-]{8,20}$/, { error: "Telefone inválido." }),
  ),
  email: textoOpcional.pipe(
    z.email({ error: "E-mail inválido." }).nullable(),
  ),
  documento: textoOpcional,
  observacoes: textoOpcional,
});

export type DadosCliente = z.infer<typeof esquemaCliente>;

// ---------------------------------------------------------------- veículos

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
  marca: textoObrigatorio("Informe a marca."),
  modelo: textoObrigatorio("Informe o modelo."),
  ano: inteiroOpcional(1950, 2100, "Ano inválido."),
});

export type DadosVeiculo = z.infer<typeof esquemaVeiculo>;

// --------------------------------------------------------- ordem de serviço

export const esquemaOrdem = z.object({
  veiculoId: z.coerce
    .number({ error: "Escolha o veículo." })
    .int()
    .positive({ error: "Escolha o veículo." }),
  descricaoProblema: textoObrigatorio(
    "Descreva o problema relatado pelo cliente.",
  ),
  kmEntrada: inteiroOpcional(0, 9_999_999, "Quilometragem inválida."),
  observacoes: textoOpcional,
});

export type DadosOrdem = z.infer<typeof esquemaOrdem>;

export const esquemaItem = z.object({
  tipo: z.enum(["peca", "servico"], { error: "Tipo inválido." }),
  descricao: textoObrigatorio("Descreva o item."),
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
