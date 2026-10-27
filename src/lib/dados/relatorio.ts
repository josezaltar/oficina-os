/*
  Relatório financeiro do mês (só gerente).

  Regime de CAIXA: conta o dinheiro pela data em que entrou ou saiu.
  - Entradas: OS ENTREGUES e PAGAS, pela data do pagamento (pagaEm).
  - Saídas: contas a pagar PAGAS, pela data do pagamento (pagaEm).
  - Saldo = entradas − saídas.
  Também mostra o que está pendente (a receber e a pagar), sem entrar no saldo.
*/
import "server-only";
import { and, asc, between, count, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientes, contasPagar, ordensServico, veiculos } from "@/db/schema";
import { exigirFinanceiro } from "@/lib/auth";
import { limitesDoMes } from "@/lib/financeiro";

const somaInt = (coluna: unknown) => sql<number>`coalesce(sum(${coluna}), 0)::int`;

export async function relatorioDoMes(mes: string) {
  await exigirFinanceiro();
  const [de, ate] = limitesDoMes(mes);

  const [recebidas, contasPagas, porCategoria, aReceber, aPagar] = await Promise.all([
    // OS entregues e pagas no mês
    db
      .select({
        id: ordensServico.id,
        pagaEm: ordensServico.pagaEm,
        totalCentavos: ordensServico.totalCentavos,
        clienteNome: sql<string>`coalesce(${ordensServico.clienteNome}, ${clientes.nome})`,
        placa: sql<string>`coalesce(${ordensServico.veiculoPlaca}, ${veiculos.placa})`,
      })
      .from(ordensServico)
      .innerJoin(veiculos, eq(veiculos.id, ordensServico.veiculoId))
      .innerJoin(clientes, eq(clientes.id, veiculos.clienteId))
      .where(and(eq(ordensServico.status, "entregue"), between(ordensServico.pagaEm, de, ate)))
      .orderBy(asc(ordensServico.pagaEm), asc(ordensServico.id)),

    // Contas pagas no mês
    db
      .select()
      .from(contasPagar)
      .where(between(contasPagar.pagaEm, de, ate))
      .orderBy(asc(contasPagar.pagaEm), asc(contasPagar.id)),

    // Saídas por categoria (para ver para onde foi o dinheiro)
    db
      .select({
        categoria: sql<string>`coalesce(${contasPagar.categoria}, 'SEM CATEGORIA')`,
        total: somaInt(contasPagar.valorCentavos),
      })
      .from(contasPagar)
      .where(between(contasPagar.pagaEm, de, ate))
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`),

    // Pendente: OS entregues que o cliente ainda não pagou (qualquer mês)
    db
      .select({ quantidade: count(), total: somaInt(ordensServico.totalCentavos) })
      .from(ordensServico)
      .where(and(eq(ordensServico.status, "entregue"), isNull(ordensServico.pagaEm))),

    // Pendente: contas ainda não pagas (qualquer mês)
    db
      .select({ quantidade: count(), total: somaInt(contasPagar.valorCentavos) })
      .from(contasPagar)
      .where(isNull(contasPagar.pagaEm)),
  ]);

  const entradas = recebidas.reduce((s, o) => s + o.totalCentavos, 0);
  const saidas = contasPagas.reduce((s, c) => s + c.valorCentavos, 0);

  return {
    de,
    ate,
    entradas,
    saidas,
    saldo: entradas - saidas,
    recebidas,
    contasPagas,
    porCategoria,
    aReceber: aReceber[0],
    aPagar: aPagar[0],
  };
}

/** Mês mais antigo com movimento (para não navegar para meses vazios sem fim). */
export async function primeiroMesComMovimento() {
  await exigirFinanceiro();
  const [linha] = await db
    .select({
      os: sql<string | null>`min(${ordensServico.pagaEm})::text`,
      contas: sql<string | null>`(select min(${contasPagar.pagaEm})::text from ${contasPagar} where ${isNotNull(contasPagar.pagaEm)})`,
    })
    .from(ordensServico);
  const datas = [linha?.os, linha?.contas].filter(Boolean) as string[];
  return datas.length ? datas.sort()[0].slice(0, 7) : null;
}
