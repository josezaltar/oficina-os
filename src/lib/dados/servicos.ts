/*
  Consultas da área Serviços (tabela de preços da oficina).
*/
import "server-only";
import { and, asc, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { catalogoServicos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { termoBusca } from "./busca";

export async function listarTabelaServicos(filtro: { busca?: string; categoria?: string }) {
  await exigirUsuario();
  const condicoes: SQL[] = [];
  const termo = termoBusca(filtro.busca);
  if (termo) {
    condicoes.push(or(ilike(catalogoServicos.descricao, termo), ilike(catalogoServicos.referencia, termo))!);
  }
  if (filtro.categoria) condicoes.push(eq(catalogoServicos.categoria, filtro.categoria));

  return db
    .select()
    .from(catalogoServicos)
    .where(and(...condicoes))
    .orderBy(asc(catalogoServicos.descricao));
}

export async function buscarServico(id: number) {
  await exigirUsuario();
  const [servico] = await db.select().from(catalogoServicos).where(eq(catalogoServicos.id, id)).limit(1);
  return servico ?? null;
}

export async function categoriasDeServico() {
  await exigirUsuario();
  const linhas = await db
    .selectDistinct({ categoria: catalogoServicos.categoria })
    .from(catalogoServicos)
    .where(isNotNull(catalogoServicos.categoria))
    .orderBy(asc(catalogoServicos.categoria));
  return linhas.map((l) => l.categoria!);
}

/** Próximo código livre no padrão da tabela antiga: "00155". */
export async function proximaReferencia() {
  await exigirUsuario();
  const [{ maior }] = await db
    .select({
      maior: sql<number>`coalesce(max(nullif(regexp_replace(${catalogoServicos.referencia}, '\\D', '', 'g'), '')::int), 0)`,
    })
    .from(catalogoServicos);
  return String(Number(maior) + 1).padStart(5, "0");
}
