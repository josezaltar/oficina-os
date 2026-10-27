import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  clientes,
  itensOs,
  ordensServico,
  statusOsEnum,
  veiculos,
  type StatusOs,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { normalizarPlaca } from "@/lib/formato";
import { termoBusca } from "./busca";

/** Confere se o texto da URL é um status válido (?status=pronta). */
export function lerStatus(texto?: string): StatusOs | undefined {
  return statusOsEnum.enumValues.find((s) => s === texto);
}

export async function listarOrdens(filtro: { status?: StatusOs; busca?: string }) {
  await exigirUsuario();

  const condicoes: SQL[] = [];
  if (filtro.status) condicoes.push(eq(ordensServico.status, filtro.status));

  const busca = filtro.busca?.trim();
  if (busca) {
    const termo = termoBusca(busca)!;
    const opcoes = [
      ilike(clientes.nome, termo),
      ilike(veiculos.placa, termoBusca(normalizarPlaca(busca))!),
      ilike(ordensServico.descricaoProblema, termo),
    ];
    // Se digitou só número, também procura pelo número da OS
    if (/^\d+$/.test(busca)) opcoes.push(eq(ordensServico.id, Number(busca)));
    condicoes.push(or(...opcoes)!);
  }

  return db
    .select({
      id: ordensServico.id,
      status: ordensServico.status,
      descricaoProblema: ordensServico.descricaoProblema,
      totalCentavos: ordensServico.totalCentavos,
      abertaEm: ordensServico.abertaEm,
      placa: veiculos.placa,
      veiculo: sql<string>`${veiculos.marca} || ' ' || ${veiculos.modelo}`,
      clienteNome: clientes.nome,
    })
    .from(ordensServico)
    .innerJoin(veiculos, eq(veiculos.id, ordensServico.veiculoId))
    .innerJoin(clientes, eq(clientes.id, veiculos.clienteId))
    .where(and(...condicoes))
    .orderBy(desc(ordensServico.abertaEm))
    .limit(100);
}

/** OS completa: veículo + cliente + itens + quem abriu. */
export async function buscarOrdem(id: number) {
  await exigirUsuario();
  return db.query.ordensServico.findFirst({
    where: eq(ordensServico.id, id),
    with: {
      veiculo: { with: { cliente: true } },
      itens: { orderBy: asc(itensOs.id) },
      // `columns` escolhe só o nome: o hash da senha nunca sai do banco à toa
      criadoPor: { columns: { nome: true } },
    },
  });
}
