/*
  Consultas de contas a pagar e dos alertas de vencimento.
*/
import "server-only";
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, lte, or, sql, sum, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { contasPagar, ordensServico } from "@/db/schema";
import { exigirFinanceiro, obterUsuario } from "@/lib/auth";
import { DIAS_DE_AVISO } from "@/lib/financeiro";
import { termoBusca } from "./busca";

export type AbaContas = "pendentes" | "pagas" | "todas";

export async function listarContas(filtro: { aba: AbaContas; busca?: string }) {
  await exigirFinanceiro();
  const condicoes: SQL[] = [];
  if (filtro.aba === "pendentes") condicoes.push(isNull(contasPagar.pagaEm));
  if (filtro.aba === "pagas") condicoes.push(isNotNull(contasPagar.pagaEm));
  const termo = termoBusca(filtro.busca);
  if (termo) {
    condicoes.push(
      or(
        ilike(contasPagar.descricao, termo),
        ilike(contasPagar.fornecedor, termo),
        ilike(contasPagar.categoria, termo),
      )!,
    );
  }

  return db
    .select()
    .from(contasPagar)
    .where(and(...condicoes))
    // Pendentes: a que vence primeiro no topo. Pagas: a paga mais recente no topo.
    .orderBy(
      ...(filtro.aba === "pagas"
        ? [desc(contasPagar.pagaEm), desc(contasPagar.id)]
        : [asc(contasPagar.vencimento), asc(contasPagar.id)]),
    )
    .limit(300);
}

export async function buscarConta(id: number) {
  await exigirFinanceiro();
  const [conta] = await db.select().from(contasPagar).where(eq(contasPagar.id, id)).limit(1);
  return conta ?? null;
}

/** Sugestões de fornecedor e categoria (o que já foi usado). */
export async function sugestoesDeContas() {
  await exigirFinanceiro();
  const [fornecedores, categorias] = await Promise.all([
    db
      .selectDistinct({ v: contasPagar.fornecedor })
      .from(contasPagar)
      .where(isNotNull(contasPagar.fornecedor))
      .orderBy(asc(contasPagar.fornecedor)),
    db
      .selectDistinct({ v: contasPagar.categoria })
      .from(contasPagar)
      .where(isNotNull(contasPagar.categoria))
      .orderBy(asc(contasPagar.categoria)),
  ]);
  const padrao = ["PEÇAS", "ÁGUA", "LUZ", "TELEFONE/INTERNET", "ALUGUEL", "IMPOSTOS", "SALÁRIOS"];
  return {
    fornecedores: fornecedores.map((f) => f.v!),
    categorias: [...new Set([...categorias.map((c) => c.v!), ...padrao])].sort(),
  };
}

/** Total pendente e total vencido (para o topo da página de contas). */
export async function totaisDeContas(hoje: string) {
  await exigirFinanceiro();
  const [linha] = await db
    .select({
      pendente: sql<number>`coalesce(sum(${contasPagar.valorCentavos}), 0)::int`,
      quantidade: count(),
      vencido: sql<number>`coalesce(sum(${contasPagar.valorCentavos}) filter (where ${contasPagar.vencimento} < ${hoje}), 0)::int`,
    })
    .from(contasPagar)
    .where(isNull(contasPagar.pagaEm));
  return linha;
}

/*
  Alertas do topo da tela (só para gerente):
  - contas não pagas que vencem em até DIAS_DE_AVISO dias, ou já venceram;
  - OS não pagas com vencimento de pagamento nesse mesmo prazo.
  Devolve null para atendente (o alerta nem aparece).
*/
export async function alertasDeVencimento(hoje: string) {
  const usuario = await obterUsuario();
  if (usuario?.papel !== "gerente") return null;

  const limite = sql`(${hoje}::date + ${DIAS_DE_AVISO}::int)`;
  const [contas, receber] = await Promise.all([
    db
      .select({
        vencidas: sql<number>`count(*) filter (where ${contasPagar.vencimento} < ${hoje})::int`,
        valorVencidas: sql<number>`coalesce(sum(${contasPagar.valorCentavos}) filter (where ${contasPagar.vencimento} < ${hoje}), 0)::int`,
        proximas: sql<number>`count(*) filter (where ${contasPagar.vencimento} >= ${hoje})::int`,
        valorProximas: sql<number>`coalesce(sum(${contasPagar.valorCentavos}) filter (where ${contasPagar.vencimento} >= ${hoje}), 0)::int`,
      })
      .from(contasPagar)
      .where(and(isNull(contasPagar.pagaEm), lte(contasPagar.vencimento, limite))),
    db
      .select({
        quantidade: count(),
        valor: sql<number>`coalesce(${sum(ordensServico.totalCentavos)}, 0)::int`,
      })
      .from(ordensServico)
      .where(and(isNull(ordensServico.pagaEm), lte(ordensServico.pagamentoVencimento, limite))),
  ]);
  return { contas: contas[0], receber: receber[0] };
}
