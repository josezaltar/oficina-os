import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormVeiculo } from "@/components/form-veiculo";
import { Cabecalho, Cartao } from "@/components/ui";
import { listarCatalogo } from "@/lib/dados/catalogo";
import { opcoesClientes } from "@/lib/dados/clientes";
import { lerId } from "@/lib/dados/id";
import { buscarVeiculo } from "@/lib/dados/veiculos";
import { formatarPlaca } from "@/lib/formato";
import { atualizarVeiculo } from "../../acoes";

export const metadata: Metadata = { title: "Editar veículo" };

export default async function EditarVeiculoPage({
  params,
}: PageProps<"/veiculos/[id]/editar">) {
  const id = lerId((await params).id);
  // Promise.all: as consultas rodam ao mesmo tempo, não uma depois da outra
  const [veiculo, clientes, catalogo] = await Promise.all([
    buscarVeiculo(id),
    opcoesClientes(),
    listarCatalogo(),
  ]);
  if (!veiculo) notFound();

  return (
    <div>
      <Cabecalho titulo="Editar veículo" descricao={formatarPlaca(veiculo.placa)} />
      <Cartao>
        <FormVeiculo
          acao={atualizarVeiculo.bind(null, id)}
          clientes={clientes}
          catalogo={catalogo}
          voltarPara={`/veiculos/${id}`}
          inicial={{
            clienteId: String(veiculo.clienteId),
            placa: veiculo.placa,
            marca: veiculo.marca,
            modelo: veiculo.modelo,
            tipo: veiculo.tipo ?? "",
            ano: veiculo.ano ? String(veiculo.ano) : "",
          }}
        />
      </Cartao>
    </div>
  );
}
