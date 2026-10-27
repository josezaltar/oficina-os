/*
  Catálogo de marca/modelo/ano (a "memória" do formulário de veículo).
*/
import "server-only";
import { and, asc, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { catalogoServicos, catalogoVeiculos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";

export type ItemCatalogo = { marca: string; modelo: string; ano: number | null };

/** Todas as combinações já cadastradas, para as sugestões do formulário. */
export async function listarCatalogo(): Promise<ItemCatalogo[]> {
  await exigirUsuario();
  return db
    .select({
      marca: catalogoVeiculos.marca,
      modelo: catalogoVeiculos.modelo,
      ano: catalogoVeiculos.ano,
    })
    .from(catalogoVeiculos)
    .orderBy(asc(catalogoVeiculos.marca), asc(catalogoVeiculos.modelo), asc(catalogoVeiculos.ano));
}

// Tipo da transação do Drizzle: assim a função funciona dentro de db.transaction()
type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Usa a grafia que JÁ EXISTE no catálogo e registra a combinação nova.
 *
 * Exemplo: se "Scania" já está salvo e alguém digita "SCANIA", o veículo é
 * gravado como "Scania". Assim a lista de sugestões nunca fica com a
 * mesma marca escrita de dois jeitos.
 *
 * Devolve marca e modelo com a grafia oficial, para gravar no veículo.
 */
export async function registrarNoCatalogo(tx: Transacao, item: ItemCatalogo) {
  const mesmaMarca = sql`lower(${catalogoVeiculos.marca}) = lower(${item.marca})`;

  const [marcaExistente] = await tx
    .select({ marca: catalogoVeiculos.marca })
    .from(catalogoVeiculos)
    .where(mesmaMarca)
    .orderBy(asc(catalogoVeiculos.id)) // a grafia mais antiga é a oficial
    .limit(1);
  const marca = marcaExistente?.marca ?? item.marca;

  const [modeloExistente] = await tx
    .select({ modelo: catalogoVeiculos.modelo })
    .from(catalogoVeiculos)
    .where(and(mesmaMarca, sql`lower(${catalogoVeiculos.modelo}) = lower(${item.modelo})`))
    .orderBy(asc(catalogoVeiculos.id))
    .limit(1);
  const modelo = modeloExistente?.modelo ?? item.modelo;

  // Se a combinação já existe, o índice único barra e o DO NOTHING ignora
  await tx
    .insert(catalogoVeiculos)
    .values({ marca, modelo, ano: item.ano })
    .onConflictDoNothing();

  return { marca, modelo };
}

// ------------------------------------------------- descrições de serviço

/** Todas as descrições já usadas, para as sugestões da tabela de itens. */
export async function listarServicos(): Promise<string[]> {
  await exigirUsuario();
  const linhas = await db
    .select({ descricao: catalogoServicos.descricao })
    .from(catalogoServicos)
    .orderBy(asc(catalogoServicos.descricao));
  return linhas.map((l) => l.descricao);
}

/**
 * Registra as descrições no catálogo e devolve cada uma com a grafia que já
 * existia ("troca de óleo" → "Troca de óleo"), na mesma ordem recebida.
 */
export async function registrarServicos(tx: Transacao, descricoes: string[]) {
  if (descricoes.length === 0) return [];

  // 1. grava as novas; as que já existem são ignoradas pelo índice único
  await tx
    .insert(catalogoServicos)
    .values(descricoes.map((descricao) => ({ descricao })))
    .onConflictDoNothing();

  // 2. busca a grafia oficial de todas elas
  const minusculas = [...new Set(descricoes.map((d) => d.toLowerCase()))];
  const existentes = await tx
    .select({ descricao: catalogoServicos.descricao })
    .from(catalogoServicos)
    .where(inArray(sql`lower(${catalogoServicos.descricao})`, minusculas));
  const oficial = new Map(existentes.map((e) => [e.descricao.toLowerCase(), e.descricao]));

  return descricoes.map((d) => oficial.get(d.toLowerCase()) ?? d);
}
