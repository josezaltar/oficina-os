/*
  Dados da tela "Nova OS" no formato do bloco de papel da oficina.
*/
import "server-only";
import { asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { clientes, veiculos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { normalizarPlaca } from "@/lib/formato";
import { listarCatalogo } from "./catalogo";

/** O que a busca pela placa devolve para preencher o bloco. */
export type DadosDaPlaca = {
  veiculoId: number;
  clienteId: number;
  nome: string;
  telefone: string;
  cidade: string | null;
  cep: string | null;
  numero: string | null;
  marca: string;
  modelo: string;
  tipo: string | null;
};

/** Procura o veículo pela placa. null = placa nova. */
export async function dadosPorPlaca(placa: string): Promise<DadosDaPlaca | null> {
  await exigirUsuario();
  const [linha] = await db
    .select({
      veiculoId: veiculos.id,
      clienteId: clientes.id,
      nome: clientes.nome,
      telefone: clientes.telefone,
      cidade: clientes.cidade,
      cep: clientes.cep,
      numero: clientes.numero,
      marca: veiculos.marca,
      modelo: veiculos.modelo,
      tipo: veiculos.tipo,
    })
    .from(veiculos)
    .innerJoin(clientes, eq(clientes.id, veiculos.clienteId))
    .where(eq(veiculos.placa, normalizarPlaca(placa)))
    .limit(1);
  return linha ?? null;
}

export type ClienteSugestao = {
  id: number;
  nome: string;
  telefone: string;
  cidade: string | null;
  cep: string | null;
  numero: string | null;
};

/**
 * Listas para as sugestões do bloco:
 * - clientes: ao digitar o nome de um cliente que já existe (ex.: dono de
 *   frota trazendo outro caminhão), o telefone e o endereço são preenchidos;
 * - cidades e tipos já usados;
 * - catálogo de marca/modelo.
 */
export async function sugestoesDoBloco() {
  await exigirUsuario();
  const [listaClientes, cidades, tipos, catalogo] = await Promise.all([
    db
      .select({
        id: clientes.id,
        nome: clientes.nome,
        telefone: clientes.telefone,
        cidade: clientes.cidade,
        cep: clientes.cep,
        numero: clientes.numero,
      })
      .from(clientes)
      .orderBy(asc(clientes.nome)),
    db
      .selectDistinct({ valor: clientes.cidade })
      .from(clientes)
      .where(isNotNull(clientes.cidade))
      .orderBy(asc(clientes.cidade)),
    db
      .selectDistinct({ valor: veiculos.tipo })
      .from(veiculos)
      .where(isNotNull(veiculos.tipo))
      .orderBy(asc(veiculos.tipo)),
    listarCatalogo(),
  ]);

  return {
    clientes: listaClientes as ClienteSugestao[],
    cidades: cidades.map((c) => c.valor!),
    tipos: tipos.map((t) => t.valor!),
    catalogo,
  };
}
