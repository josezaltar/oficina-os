"use server";
/*
  Server Actions da ordem de serviço (etapa 6).

  Aqui aparecem as TRANSAÇÕES: um bloco de operações no banco que acontece
  "tudo ou nada". Ao salvar os itens, apagamos os antigos, inserimos os novos
  e atualizamos o total. Se qualquer passo falhar no meio, o banco desfaz
  tudo, e a OS nunca fica com itens novos e o total velho.
*/
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { clientes, itensOs, ordensServico, statusOsEnum, veiculos } from "@/db/schema";
import { exigirGerente, exigirUsuario } from "@/lib/auth";
import { dadosPorPlaca, type DadosDaPlaca } from "@/lib/dados/bloco";
import { registrarNoCatalogo, registrarServicos } from "@/lib/dados/catalogo";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/estado-form";
import { hojeEmSaoPaulo, normalizarPlaca } from "@/lib/formato";
import {
  ROTULO_STATUS,
  calcularTotalCentavos,
  podeEditarItens,
  podeExcluirOs,
  podeMudarStatus,
} from "@/lib/regras-os";
import {
  REGEX_PLACA,
  esquemaItens,
  esquemaOrdem,
  esquemaPagamentoOs,
  type DadosItem,
} from "@/lib/validacao";

/** Erro de regra de negócio: a mensagem pode ser mostrada para a pessoa. */
class ErroRegra extends Error {}

function revalidarOrdem(id: number) {
  revalidatePath("/ordens");
  revalidatePath(`/ordens/${id}`);
  revalidatePath("/"); // o painel mostra contagens e faturamento
}

// --------------------------------------------------------------- abrir OS

/** Busca usada pelo bloco quando o atendente termina de digitar a placa. */
export async function consultarPlaca(placa: string): Promise<DadosDaPlaca | null> {
  if (!REGEX_PLACA.test(normalizarPlaca(placa))) return null;
  return dadosPorPlaca(placa);
}

const CAMPOS_BLOCO = [
  "placa",
  "data",
  "nome",
  "telefone",
  "cidade",
  "cep",
  "numero",
  "marca",
  "modelo",
  "tipoVeiculo",
];

/*
  Abre a OS a partir do bloco, numa transação só:
  1. placa conhecida → usa o veículo (e o cliente) que já existem, SEM mudar
     o cadastro: o que foi digitado fica só nesta OS;
  2. placa nova → cadastra o veículo; o cliente é reaproveitado se já existir
     um com o mesmo nome (dono de frota trazendo outro caminhão), senão é
     cadastrado também;
  3. grava a OS com a cópia do cabeçalho e os itens, e calcula o total.
*/
export async function criarOrdem(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const usuario = await exigirUsuario();

  const valores = lerCampos(formData, CAMPOS_BLOCO);
  const cabecalho = esquemaOrdem.safeParse(valores);
  const itens = esquemaItens.safeParse(lerItens(formData));

  if (!cabecalho.success || !itens.success) {
    // Junta os erros do cabeçalho e dos itens numa resposta só
    const erros = {
      ...(cabecalho.success ? {} : errosDoZod(cabecalho.error).erros),
      ...(itens.success ? {} : errosDoZod(itens.error).erros),
    };
    return { erros, mensagem: "Corrija os campos destacados." };
  }

  const b = cabecalho.data;

  // Pagamento informado no bloco (opcional): vencimento e/ou "já pago"
  const pagamento = esquemaPagamentoOs.safeParse({
    pagamentoVencimento: String(formData.get("pagamentoVencimento") ?? ""),
    pagaEm: "",
  });
  const pagamentoVencimento = pagamento.success ? pagamento.data.pagamentoVencimento : null;
  const pagaEm = formData.get("jaPago") === "sim" ? b.data : null; // pago no dia da OS

  const id = await db.transaction(async (tx) => {
    let [veiculo] = await tx
      .select({ id: veiculos.id })
      .from(veiculos)
      .where(eq(veiculos.placa, b.placa))
      .limit(1);

    if (!veiculo) {
      const clienteId = await clienteParaPlacaNova(tx, b);
      const grafia = await registrarNoCatalogo(tx, { marca: b.marca, modelo: b.modelo, ano: null });
      [veiculo] = await tx
        .insert(veiculos)
        .values({ clienteId, placa: b.placa, tipo: b.tipoVeiculo, ...grafia })
        .returning({ id: veiculos.id });
    }

    const [nova] = await tx
      .insert(ordensServico)
      .values({
        veiculoId: veiculo.id,
        criadoPorId: usuario.id,
        abertaEm: momentoDaData(b.data),
        clienteNome: b.nome,
        clienteTelefone: b.telefone,
        clienteCidade: b.cidade,
        clienteCep: b.cep,
        clienteNumero: b.numero,
        veiculoPlaca: b.placa,
        veiculoMarca: b.marca,
        veiculoModelo: b.modelo,
        veiculoTipo: b.tipoVeiculo,
        totalCentavos: calcularTotalCentavos(itens.data),
        pagamentoVencimento,
        pagaEm,
      })
      .returning({ id: ordensServico.id });

    await gravarItens(tx, nova.id, itens.data);
    return nova.id;
  });

  revalidarOrdem(id);
  revalidatePath("/clientes");
  revalidatePath("/veiculos");
  redirect(`/ordens/${id}`);
}

type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Grava os itens da OS e registra cada descrição no catálogo de serviços
 * (sem repetir). A descrição é gravada com a grafia que já existia.
 */
async function gravarItens(tx: Transacao, ordemId: number, itens: DadosItem[]) {
  if (itens.length === 0) return;
  const descricoes = await registrarServicos(tx, itens);
  await tx
    .insert(itensOs)
    .values(itens.map((item, i) => ({ ...item, descricao: descricoes[i], ordemId })));
}

/** Cliente dono de um veículo novo: reaproveita pelo nome ou cadastra. */
async function clienteParaPlacaNova(
  tx: Transacao,
  b: { nome: string; telefone: string; cidade: string | null; cep: string | null; numero: string | null },
) {
  const mesmoNome = await tx
    .select({ id: clientes.id, telefone: clientes.telefone })
    .from(clientes)
    .where(sql`lower(${clientes.nome}) = lower(${b.nome})`);

  const digitos = (t: string) => t.replace(/\D/g, "");
  const mesmoTelefone = mesmoNome.find((c) => digitos(c.telefone) === digitos(b.telefone));
  if (mesmoTelefone) return mesmoTelefone.id;
  if (mesmoNome.length === 1) return mesmoNome[0].id;

  const [novo] = await tx
    .insert(clientes)
    .values({
      nome: b.nome,
      telefone: b.telefone,
      cidade: b.cidade,
      cep: b.cep,
      numero: b.numero,
    })
    .returning({ id: clientes.id });
  return novo.id;
}

/**
 * Data do bloco → momento de abertura da OS.
 * Hoje: agora (com a hora certa). Outro dia (OS lançada depois): meio-dia
 * daquele dia no horário de Brasília.
 */
function momentoDaData(data: string) {
  return data === hojeEmSaoPaulo() ? new Date() : new Date(`${data}T12:00:00-03:00`);
}

/*
  O editor de itens manda os campos repetidos (tipo, descricao, quantidade,
  valor), um de cada por linha. getAll() devolve cada grupo como lista, e
  juntamos pela posição.
*/
function lerItens(formData: FormData) {
  const tipos = formData.getAll("tipo");
  const descricoes = formData.getAll("descricao");
  const quantidades = formData.getAll("quantidade");
  const valores = formData.getAll("valor");
  return tipos.map((tipo, i) => ({
    tipo: String(tipo || "servico"),
    descricao: String(descricoes[i] ?? ""),
    quantidade: String(quantidades[i] ?? ""),
    valorUnitarioCentavos: String(valores[i] ?? ""),
  }));
}

// ---------------------------------------------------------- salvar itens

export async function salvarItens(
  id: number,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirUsuario();

  const resultado = esquemaItens.safeParse(lerItens(formData));
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
      await gravarItens(tx, id, itens);

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

// ---------------------------------------------------- pagamento da OS

/*
  Controle de recebimento: quando o cliente vai pagar (vencimento) e quando
  pagou. Qualquer usuário pode registrar (o atendente recebe no balcão).
  O relatório financeiro soma as OS ENTREGUES e PAGAS, pela data do pagamento.
*/
function revalidarPagamento(id: number) {
  revalidatePath(`/ordens/${id}`);
  revalidatePath("/", "layout"); // alerta do topo, lista, painel e relatório
}

/** Salva o vencimento (dia combinado para o cliente pagar). */
export async function definirVencimentoOs(id: number, formData: FormData) {
  await exigirUsuario();
  const resultado = esquemaPagamentoOs.safeParse({
    pagamentoVencimento: String(formData.get("pagamentoVencimento") ?? ""),
    pagaEm: "",
  });
  if (!resultado.success) return;
  await db
    .update(ordensServico)
    .set({ pagamentoVencimento: resultado.data.pagamentoVencimento })
    .where(eq(ordensServico.id, id));
  revalidarPagamento(id);
}

/** Marca a OS como paga (no dia informado, ou hoje). */
export async function marcarOsPaga(id: number, formData: FormData) {
  await exigirUsuario();
  const resultado = esquemaPagamentoOs.safeParse({
    pagamentoVencimento: "",
    pagaEm: String(formData.get("pagaEm") ?? ""),
  });
  const dia = (resultado.success && resultado.data.pagaEm) || hojeEmSaoPaulo();
  await db.update(ordensServico).set({ pagaEm: dia }).where(eq(ordensServico.id, id));
  revalidarPagamento(id);
}

/** Desfaz o pagamento marcado por engano. */
export async function desfazerPagamentoOs(id: number) {
  await exigirUsuario();
  await db.update(ordensServico).set({ pagaEm: null }).where(eq(ordensServico.id, id));
  revalidarPagamento(id);
}
