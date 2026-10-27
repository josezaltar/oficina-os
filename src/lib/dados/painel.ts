/*
  Consultas AGREGADAS do painel (etapa 8): em vez de trazer todas as linhas
  e somar no JavaScript, pedimos ao banco o resultado pronto
  (COUNT, SUM, GROUP BY). É bem mais rápido e trafega bem menos dados.
*/
import "server-only";
import { and, asc, count, desc, eq, gte, ne, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { clientes, itensOs, ordensServico, veiculos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";

/*
  Início do mês atual no horário de Brasília, calculado pelo próprio banco.
  Sem o fuso, a virada do mês aconteceria às 21h do dia 31 (meia-noite UTC).
*/
const inicioDoMes = sql`(date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`;

export async function contarPorStatus() {
  await exigirUsuario();
  return db
    .select({ status: ordensServico.status, total: count() })
    .from(ordensServico)
    .groupBy(ordensServico.status);
}

/** Faturamento = soma das OS ENTREGUES no mês (é quando o cliente paga). */
export async function faturamentoDoMes() {
  await exigirUsuario();
  const [resultado] = await db
    .select({
      // sum() do SQL devolve texto (pode ser um número enorme); convertemos
      totalCentavos: sql<number>`coalesce(${sum(ordensServico.totalCentavos)}, 0)::int`,
      quantidade: count(),
      inicio: sql<Date>`${inicioDoMes}`.mapWith((v) => new Date(v)),
    })
    .from(ordensServico)
    .where(
      and(
        eq(ordensServico.status, "entregue"),
        gte(ordensServico.entregueEm, inicioDoMes),
      ),
    );
  return resultado;
}

/** Serviços mais lançados nas OS abertas este mês. */
export async function servicosMaisFeitos(limite = 5) {
  await exigirUsuario();
  const vezes = count();
  return db
    .select({
      descricao: itensOs.descricao,
      vezes,
      totalCentavos: sql<number>`sum(round(${itensOs.quantidade} * ${itensOs.valorUnitarioCentavos}))::int`,
    })
    .from(itensOs)
    .innerJoin(ordensServico, eq(ordensServico.id, itensOs.ordemId))
    .where(and(eq(itensOs.tipo, "servico"), gte(ordensServico.abertaEm, inicioDoMes)))
    .groupBy(itensOs.descricao)
    .orderBy(desc(vezes), asc(itensOs.descricao))
    .limit(limite);
}

/** Fila da oficina: OS ainda não entregues, as mais antigas primeiro. */
export async function filaDeTrabalho(limite = 8) {
  await exigirUsuario();
  return db
    .select({
      id: ordensServico.id,
      status: ordensServico.status,
      placa: veiculos.placa,
      veiculo: sql<string>`${veiculos.marca} || ' ' || ${veiculos.modelo}`,
      clienteNome: clientes.nome,
      // Dias parada na oficina, calculado pelo banco
      dias: sql<number>`extract(day from now() - ${ordensServico.abertaEm})::int`,
    })
    .from(ordensServico)
    .innerJoin(veiculos, eq(veiculos.id, ordensServico.veiculoId))
    .innerJoin(clientes, eq(clientes.id, veiculos.clienteId))
    .where(ne(ordensServico.status, "entregue"))
    .orderBy(asc(ordensServico.abertaEm))
    .limit(limite);
}
