/*
  Camada de dados de clientes: todas as consultas ao banco ficam aqui, e
  não espalhadas pelas páginas. Vantagens:
  - a página só pede "me dá os clientes" sem saber de SQL;
  - a checagem de login (etapa 7) fica num lugar só, perto dos dados.
*/
import "server-only";
import { asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { clientes, ordensServico, veiculos } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { termoBusca } from "./busca";

export async function listarClientes(busca?: string) {
  await exigirUsuario();
  const termo = termoBusca(busca);

  return db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      telefone: clientes.telefone,
      documento: clientes.documento,
      // Subconsulta agregada: quantos veículos cada cliente tem
      totalVeiculos: count(veiculos.id),
    })
    .from(clientes)
    .leftJoin(veiculos, eq(veiculos.clienteId, clientes.id))
    .where(
      termo
        ? or(
            ilike(clientes.nome, termo), // ilike = "contém", sem diferenciar maiúsculas
            ilike(clientes.telefone, termo),
            ilike(clientes.documento, termo),
          )
        : undefined,
    )
    .groupBy(clientes.id)
    .orderBy(asc(clientes.nome))
    .limit(100);
}

export async function buscarCliente(id: number) {
  await exigirUsuario();
  // `db.query` usa as relations do schema para trazer dados aninhados
  return db.query.clientes.findFirst({
    where: eq(clientes.id, id),
    with: {
      veiculos: {
        orderBy: asc(veiculos.placa),
        with: {
          ordens: { orderBy: desc(ordensServico.abertaEm), limit: 5 },
        },
      },
    },
  });
}

/** Lista curta para o <select> do formulário de veículo. */
export async function opcoesClientes() {
  await exigirUsuario();
  return db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(asc(clientes.nome));
}
