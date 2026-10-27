"use server";
/*
  Server Actions da ordem de serviço (etapa 6).

  Aqui aparecem as TRANSAÇÕES: um bloco de operações no banco que acontece
  "tudo ou nada". Ao salvar os itens, apagamos os antigos, inserimos os novos
  e atualizamos o total. Se qualquer passo falhar no meio, o banco desfaz
  tudo, e a OS nunca fica com itens novos e o total velho.
*/
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { itensOs, ordensServico, statusOsEnum } from "@/db/schema";
import { exigirGerente, exigirUsuario } from "@/lib/auth";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/estado-form";
import {
  ROTULO_STATUS,
  calcularTotalCentavos,
  podeEditarItens,
  podeExcluirOs,
  podeMudarStatus,
} from "@/lib/regras-os";
import { esquemaItens, esquemaOrdem } from "@/lib/validacao";

/** Erro de regra de negócio: a mensagem pode ser mostrada para a pessoa. */
class ErroRegra extends Error {}

function revalidarOrdem(id: number) {
  revalidatePath("/ordens");
  revalidatePath(`/ordens/${id}`);
  revalidatePath("/"); // o painel mostra contagens e faturamento
}

// --------------------------------------------------------------- abrir OS

export async function criarOrdem(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const usuario = await exigirUsuario();

  const valores = lerCampos(formData, [
    "veiculoId",
    "descricaoProblema",
    "kmEntrada",
    "observacoes",
  ]);
  const resultado = esquemaOrdem.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  const [nova] = await db
    .insert(ordensServico)
    .values({ ...resultado.data, criadoPorId: usuario.id })
    .returning({ id: ordensServico.id, veiculoId: ordensServico.veiculoId });

  revalidarOrdem(nova.id);
  revalidatePath(`/veiculos/${nova.veiculoId}`);
  redirect(`/ordens/${nova.id}`);
}

// ---------------------------------------------------------- salvar itens

export async function salvarItens(
  id: number,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirUsuario();

  /*
    O editor manda os itens como campos repetidos:
      tipo=peca, tipo=servico / descricao=..., descricao=... / etc.
    getAll() devolve cada grupo como lista; juntamos pela posição.
  */
  const tipos = formData.getAll("tipo");
  const descricoes = formData.getAll("descricao");
  const quantidades = formData.getAll("quantidade");
  const valores = formData.getAll("valor");
  const brutos = tipos.map((tipo, i) => ({
    tipo: String(tipo),
    descricao: String(descricoes[i] ?? ""),
    quantidade: String(quantidades[i] ?? ""),
    valorUnitarioCentavos: String(valores[i] ?? ""),
  }));

  const resultado = esquemaItens.safeParse(brutos);
  if (!resultado.success) {
    // Os erros vêm como "2.descricao" (linha 2, campo descrição)
    return errosDoZod(resultado.error);
  }
  const itens = resultado.data;

  try {
    await db.transaction(async (tx) => {
      // FOR UPDATE "tranca" a linha da OS até o fim da transação: se outra
      // pessoa mudar o status ao mesmo tempo, ela espera esta terminar.
      const [ordem] = await tx
        .select({ status: ordensServico.status })
        .from(ordensServico)
        .where(eq(ordensServico.id, id))
        .for("update");

      if (!ordem) throw new ErroRegra("Ordem de serviço não encontrada.");
      if (!podeEditarItens(ordem.status)) {
        throw new ErroRegra(
          `A OS está "${ROTULO_STATUS[ordem.status]}" e os itens não podem mais ser alterados.`,
        );
      }

      await tx.delete(itensOs).where(eq(itensOs.ordemId, id));
      if (itens.length > 0) {
        await tx.insert(itensOs).values(itens.map((item) => ({ ...item, ordemId: id })));
      }

      // O total é SEMPRE calculado aqui no servidor. O valor que o navegador
      // mostra é só uma prévia: ninguém consegue "mandar" um total falso.
      await tx
        .update(ordensServico)
        .set({ totalCentavos: calcularTotalCentavos(itens) })
        .where(eq(ordensServico.id, id));
    });
  } catch (erro) {
    if (erro instanceof ErroRegra) return { mensagem: erro.message };
    throw erro;
  }

  revalidarOrdem(id);
  return { sucesso: true, mensagem: "Itens salvos." };
}

// ---------------------------------------------------------- mudar status

const esquemaStatus = z.enum(statusOsEnum.enumValues);

export async function mudarStatus(
  id: number,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirUsuario();

  // O botão clicado manda name="para" value="pronta" (por exemplo)
  const para = esquemaStatus.safeParse(formData.get("para"));
  if (!para.success) return { mensagem: "Status inválido." };

  try {
    await db.transaction(async (tx) => {
      const [ordem] = await tx
        .select({ status: ordensServico.status })
        .from(ordensServico)
        .where(eq(ordensServico.id, id))
        .for("update");

      if (!ordem) throw new ErroRegra("Ordem de serviço não encontrada.");
      if (!podeMudarStatus(ordem.status, para.data)) {
        throw new ErroRegra(
          `Não é possível ir de "${ROTULO_STATUS[ordem.status]}" para "${ROTULO_STATUS[para.data]}".`,
        );
      }

      await tx
        .update(ordensServico)
        .set({
          status: para.data,
          // Data de entrega: usada no faturamento do mês (painel)
          entregueEm: para.data === "entregue" ? new Date() : null,
        })
        .where(eq(ordensServico.id, id));
    });
  } catch (erro) {
    if (erro instanceof ErroRegra) return { mensagem: erro.message };
    throw erro;
  }

  revalidarOrdem(id);
  return { sucesso: true, mensagem: `Status alterado para "${ROTULO_STATUS[para.data]}".` };
}

// ------------------------------------------------------------- excluir OS

export async function excluirOrdem(
  id: number,
  _estado: EstadoForm,
): Promise<EstadoForm> {
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };

  const ordem = await db.query.ordensServico.findFirst({
    where: eq(ordensServico.id, id),
    columns: { status: true },
  });
  if (!ordem) return { mensagem: "Ordem de serviço não encontrada." };
  if (!podeExcluirOs(ordem.status)) {
    return { mensagem: "OS entregue faz parte do faturamento e não pode ser excluída." };
  }

  // Os itens são apagados junto (onDelete: cascade no schema)
  await db.delete(ordensServico).where(eq(ordensServico.id, id));

  revalidarOrdem(id);
  redirect("/ordens");
}
