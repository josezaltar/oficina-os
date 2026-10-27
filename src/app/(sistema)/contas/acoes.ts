"use server";
/*
  Server Actions de contas a pagar (só gerente).
*/
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { contasPagar } from "@/db/schema";
import { exigirGerente } from "@/lib/auth";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/estado-form";
import { hojeEmSaoPaulo } from "@/lib/formato";
import { esquemaConta, type DadosConta } from "@/lib/validacao";

const CAMPOS = ["descricao", "fornecedor", "categoria", "valor", "vencimento", "pagaEm", "observacoes"];

function paraBanco(d: DadosConta) {
  const { valor, ...resto } = d;
  return { ...resto, valorCentavos: valor };
}

// O alerta do topo aparece em TODAS as páginas, então revalida o layout inteiro
function revalidarContas() {
  revalidatePath("/", "layout");
}

export async function criarConta(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };

  const valores = lerCampos(formData, CAMPOS);
  const resultado = esquemaConta.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  await db.insert(contasPagar).values(paraBanco(resultado.data));
  revalidarContas();
  redirect("/contas");
}

export async function atualizarConta(id: number, _estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };

  const valores = lerCampos(formData, CAMPOS);
  const resultado = esquemaConta.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  await db.update(contasPagar).set(paraBanco(resultado.data)).where(eq(contasPagar.id, id));
  revalidarContas();
  redirect("/contas");
}

/** Botão "Pagar" da lista: marca como paga HOJE. A conta sai da lista e do alerta. */
export async function pagarConta(id: number) {
  const permissao = await exigirGerente();
  if (!permissao.ok) return;
  await db.update(contasPagar).set({ pagaEm: hojeEmSaoPaulo() }).where(eq(contasPagar.id, id));
  revalidarContas();
}

/** Desfaz um pagamento marcado por engano: a conta volta para as pendentes. */
export async function desfazerPagamentoConta(id: number) {
  const permissao = await exigirGerente();
  if (!permissao.ok) return;
  await db.update(contasPagar).set({ pagaEm: null }).where(eq(contasPagar.id, id));
  revalidarContas();
}

export async function excluirConta(id: number, _estado: EstadoForm): Promise<EstadoForm> {
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };
  await db.delete(contasPagar).where(eq(contasPagar.id, id));
  revalidarContas();
  redirect("/contas");
}
