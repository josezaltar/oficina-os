import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormCliente } from "@/components/form-cliente";
import { Cabecalho, Cartao } from "@/components/ui";
import { buscarCliente } from "@/lib/dados/clientes";
import { lerId } from "@/lib/dados/id";
import { atualizarCliente } from "../../acoes";

export const metadata: Metadata = { title: "Editar cliente" };

// Rota dinâmica: [id] na pasta vira `params.id` (sempre string).
export default async function EditarClientePage({
  params,
}: PageProps<"/clientes/[id]/editar">) {
  const id = lerId((await params).id);
  const cliente = await buscarCliente(id);
  if (!cliente) notFound();

  return (
    <div>
      <Cabecalho titulo="Editar cliente" descricao={cliente.nome} />
      <Cartao>
        <FormCliente
          // .bind "amarra" o id como primeiro argumento da Server Action
          acao={atualizarCliente.bind(null, id)}
          voltarPara={`/clientes/${id}`}
          inicial={{
            nome: cliente.nome,
            telefone: cliente.telefone,
            email: cliente.email ?? "",
            documento: cliente.documento ?? "",
            observacoes: cliente.observacoes ?? "",
          }}
        />
      </Cartao>
    </div>
  );
}
