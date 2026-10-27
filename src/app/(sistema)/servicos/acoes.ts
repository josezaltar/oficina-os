"use server";
/*
  Server Actions da área Serviços (tabela de preços da oficina).
  Mesmo padrão dos clientes: login → Zod → banco → revalidar → redirecionar.
*/
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { catalogoServicos } from "@/db/schema";
import { exigirGerente, exigirUsuario } from "@/lib/auth";
import {
  codigoErroPg,
  errosDoZod,
  lerCampos,
  restricaoErroPg,
  type EstadoForm,
} from "@/lib/estado-form";
import { esquemaServico, type DadosServico } from "@/lib/validacao";

const CAMPOS = ["referencia", "descricao", "preco", "categoria"];

function dadosParaBanco(d: DadosServico) {
  return {
    referencia: d.referencia,
    descricao: d.descricao,
    precoCentavos: d.preco,
    categoria: d.categoria,
  };
}

/** Converte "valor repetido" do banco em erro no campo certo. */
function erroDeRepetido(erro: unknown, valores: Record<string, string>): EstadoForm | null {
  if (codigoErroPg(erro) !== "23505") return null;
  const campo = restricaoErroPg(erro)?.includes("referencia") ? "referencia" : "descricao";
  return {
    erros: {
      [campo]: [
        campo === "referencia"
          ? "Já existe um serviço com este código."
          : "Já existe um serviço com esta descrição.",
      ],
    },
    mensagem: "Corrija os campos destacados.",
    valores,
  };
}

function revalidarServicos() {
  revalidatePath("/servicos");
  revalidatePath("/ordens/nova");
}

export async function criarServico(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirUsuario();
  const valores = lerCampos(formData, CAMPOS);
  const resultado = esquemaServico.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  try {
    await db.insert(catalogoServicos).values(dadosParaBanco(resultado.data));
  } catch (erro) {
    const repetido = erroDeRepetido(erro, valores);
    if (repetido) return repetido;
    throw erro;
  }

  revalidarServicos();
  redirect(`/servicos?busca=${encodeURIComponent(resultado.data.descricao)}`);
}

export async function atualizarServico(
  id: number,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirUsuario();
  const valores = lerCampos(formData, CAMPOS);
  const resultado = esquemaServico.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  try {
    await db.update(catalogoServicos).set(dadosParaBanco(resultado.data)).where(eq(catalogoServicos.id, id));
  } catch (erro) {
    const repetido = erroDeRepetido(erro, valores);
    if (repetido) return repetido;
    throw erro;
  }

  revalidarServicos();
  redirect("/servicos");
}

/*
  Excluir só tira o serviço da tabela de preços e das sugestões.
  As OS antigas NÃO mudam: cada item guarda a própria descrição e preço.
*/
export async function excluirServico(id: number, _estado: EstadoForm): Promise<EstadoForm> {
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };

  await db.delete(catalogoServicos).where(eq(catalogoServicos.id, id));
  revalidarServicos();
  redirect("/servicos");
}
