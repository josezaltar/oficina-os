import type { Metadata } from "next";
import { FormVeiculo } from "@/components/form-veiculo";
import { Cabecalho, Cartao, EstadoVazio } from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import { opcoesClientes } from "@/lib/dados/clientes";
import { criarVeiculo } from "../acoes";

export const metadata: Metadata = { title: "Novo veículo" };

// /veiculos/novo?clienteId=3 já deixa o cliente 3 selecionado
// (é o link "+ Adicionar veículo" da página do cliente).
export default async function NovoVeiculoPage({
  searchParams,
}: PageProps<"/veiculos/novo">) {
  const clienteId = primeiroValor((await searchParams).clienteId) ?? "";
  const clientes = await opcoesClientes();

  return (
    <div>
      <Cabecalho titulo="Novo veículo" />
      <Cartao>
        {clientes.length === 0 ? (
          <EstadoVazio acao={{ href: "/clientes/novo", rotulo: "Cadastrar cliente" }}>
            Cadastre um cliente antes de cadastrar o veículo.
          </EstadoVazio>
        ) : (
          <FormVeiculo
            acao={criarVeiculo}
            clientes={clientes}
            inicial={{ clienteId }}
            voltarPara={clienteId ? `/clientes/${clienteId}` : "/veiculos"}
          />
        )}
      </Cartao>
    </div>
  );
}
