/*
  Formato padrão do "estado" que as Server Actions devolvem para os
  formulários (via useActionState). Ter um formato só deixa todos os
  formulários iguais: erros por campo, uma mensagem geral e os valores
  digitados (para o formulário não "apagar" o que a pessoa escreveu).
*/
import type { z } from "zod";

export type EstadoForm = {
  erros?: Record<string, string[] | undefined>;
  mensagem?: string;
  sucesso?: boolean;
  valores?: Record<string, string>;
};

export const estadoInicial: EstadoForm = {};

/** Lê os campos do FormData como texto (campo ausente vira ""). */
export function lerCampos<T extends string>(formData: FormData, nomes: T[]) {
  const valores = {} as Record<T, string>;
  for (const nome of nomes) {
    const valor = formData.get(nome);
    valores[nome] = typeof valor === "string" ? valor : "";
  }
  return valores;
}

/** Converte o erro do Zod no formato { campo: ["mensagem"] }. */
export function errosDoZod(
  erro: z.ZodError,
  valores?: Record<string, string>,
): EstadoForm {
  const erros: Record<string, string[]> = {};
  for (const problema of erro.issues) {
    const campo = problema.path.join(".") || "_geral";
    (erros[campo] ??= []).push(problema.message);
  }
  return {
    erros,
    mensagem: "Corrija os campos destacados.",
    valores,
  };
}

/*
  Códigos de erro do PostgreSQL que tratamos com mensagens amigáveis:
  23505 = valor repetido em coluna "unique" (ex.: placa já cadastrada)
  23503 = chave estrangeira (ex.: excluir cliente que ainda tem veículos)
*/
export function codigoErroPg(erro: unknown): string | undefined {
  // O Drizzle embrulha o erro do driver em `cause`.
  const candidatos = [erro, (erro as { cause?: unknown })?.cause];
  for (const c of candidatos) {
    if (c && typeof c === "object" && "code" in c && typeof c.code === "string") {
      return c.code;
    }
  }
  return undefined;
}
