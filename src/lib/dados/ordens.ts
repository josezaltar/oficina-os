import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
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

export type FiltroPagamento = "a_receber" | "pagas";

export async function listarOrdens(filtro: {
  status?: StatusOs;
  busca?: string;
  pagamento?: FiltroPagamento;
}) {
  await exigirUsuario();

  const condicoes: SQL[] = [];
  if (filtro.status) condicoes.push(eq(ordensServico.status, filtro.status));
  if (filtro.pagamento === "a_receber") condicoes.push(isNull(ordensServico.pagaEm));
  if (filtro.pagamento === "pagas") condicoes.push(isNotNull(ordensServico.pagaEm));

  const busca = filtro.busca?.trim();
  if (busca) {
    const termo = termoBusca(busca)!;
    const opcoes = [
      ilike(clientes.nome, termo),
      ilike(ordensServico.clienteNome, termo),
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
      pagamentoVencimento: ordensServico.pagamentoVencimento,
      pagaEm: ordensServico.pagaEm,
      // coalesce: o que foi escrito na OS; se for uma OS antiga, o cadastro
      placa: sql<string>`coalesce(${ordensServico.veiculoPlaca}, ${veiculos.placa})`,
      veiculo: sql<string>`coalesce(${ordensServico.veiculoMarca}, ${veiculos.marca}) || ' ' || coalesce(${ordensServico.veiculoModelo}, ${veiculos.modelo})`,
      clienteNome: sql<string>`coalesce(${ordensServico.clienteNome}, ${clientes.nome})`,
    })
    .from(ordensServico)
    .innerJoin(veiculos, eq(veiculos.id, ordensServico.veiculoId))
    .innerJoin(clientes, eq(clientes.id, veiculos.clienteId))
    .where(and(...condicoes))
    // "A receber": quem vence primeiro no topo (sem vencimento no fim)
    .orderBy(
      ...(filtro.pagamento === "a_receber"
        ? [sql`${ordensServico.pagamentoVencimento} asc nulls last`, desc(ordensServico.abertaEm)]
        : [desc(ordensServico.abertaEm)]),
    )
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

type OrdemCompleta = NonNullable<Awaited<ReturnType<typeof buscarOrdem>>>;

/**
 * Cabeçalho do bloco desta OS: o que foi escrito NELA.
 * (As OS antigas, sem a cópia, usam o cadastro atual.)
 */
export function cabecalhoDaOrdem(ordem: OrdemCompleta) {
  const { veiculo } = ordem;
  const { cliente } = veiculo;
  return {
    nome: ordem.clienteNome ?? cliente.nome,
    telefone: ordem.clienteTelefone ?? cliente.telefone,
    cidade: ordem.clienteCidade ?? cliente.cidade,
    cep: ordem.clienteCep ?? cliente.cep,
    numero: ordem.clienteNumero ?? cliente.numero,
    placa: ordem.veiculoPlaca ?? veiculo.placa,
    marca: ordem.veiculoMarca ?? veiculo.marca,
    modelo: ordem.veiculoModelo ?? veiculo.modelo,
    tipo: ordem.veiculoTipo ?? veiculo.tipo,
  };
}
