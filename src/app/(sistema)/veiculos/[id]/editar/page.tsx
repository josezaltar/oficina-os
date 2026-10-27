import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormVeiculo } from "@/components/form-veiculo";
import { Cabecalho, Cartao } from "@/components/ui";
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
  // Promise.all: as duas consultas rodam ao mesmo tempo, não uma depois da outra
  const [veiculo, clientes] = await Promise.all([buscarVeiculo(id), opcoesClientes()]);
  if (!veiculo) notFound();

  return (
    <div>
      <Cabecalho titulo="Editar veículo" descricao={formatarPlaca(veiculo.placa)} />
      <Cartao>
        <FormVeiculo
          acao={atualizarVeiculo.bind(null, id)}
          clientes={clientes}
          voltarPara={`/veiculos/${id}`}
          inicial={{
            clienteId: String(veiculo.clienteId),
            placa: veiculo.placa,
            marca: veiculo.marca,
            modelo: veiculo.modelo,
            ano: veiculo.ano ? String(veiculo.ano) : "",
          }}
        />
      </Cartao>
    </div>
  );
}
