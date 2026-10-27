import "server-only";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { clientes, ordensServico, veiculos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { normalizarPlaca } from "@/lib/formato";
import { termoBusca } from "./busca";

export async function listarVeiculos(busca?: string) {
  await exigirUsuario();
  const termo = termoBusca(busca);
  // A placa é guardada sem hífen, então "ABC-1D23" também precisa achar.
  const termoPlaca = busca ? termoBusca(normalizarPlaca(busca)) : undefined;

  return db
    .select({
      id: veiculos.id,
      placa: veiculos.placa,
      marca: veiculos.marca,
      modelo: veiculos.modelo,
      ano: veiculos.ano,
      clienteId: clientes.id,
      clienteNome: clientes.nome,
    })
    .from(veiculos)
    // innerJoin: todo veículo tem cliente (cliente_id é NOT NULL)
    .innerJoin(clientes, eq(clientes.id, veiculos.clienteId))
    .where(
      termo
        ? or(
            ilike(veiculos.placa, termoPlaca!),
            ilike(veiculos.modelo, termo),
            ilike(veiculos.marca, termo),
            ilike(clientes.nome, termo),
          )
        : undefined,
    )
    .orderBy(asc(veiculos.placa))
    .limit(100);
}

export async function buscarVeiculo(id: number) {
  await exigirUsuario();
  return db.query.veiculos.findFirst({
    where: eq(veiculos.id, id),
    with: {
      cliente: true,
      ordens: { orderBy: desc(ordensServico.abertaEm) },
    },
  });
}

/** Lista para o <select> da nova OS: "ABC1D23 · Scania R 450 · Cliente". */
export async function opcoesVeiculos() {
  await exigirUsuario();
  return db
    .select({
      id: veiculos.id,
      placa: veiculos.placa,
      marca: veiculos.marca,
      modelo: veiculos.modelo,
      clienteNome: clientes.nome,
    })
    .from(veiculos)
    .innerJoin(clientes, eq(clientes.id, veiculos.clienteId))
    .orderBy(asc(veiculos.placa));
}
