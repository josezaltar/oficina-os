import type { Metadata } from "next";
import { FormOrdem } from "@/components/form-ordem";
import { Cabecalho, Cartao, EstadoVazio } from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import { opcoesVeiculos } from "@/lib/dados/veiculos";
import { criarOrdem } from "../acoes";

export const metadata: Metadata = { title: "Nova OS" };

export default async function NovaOrdemPage({ searchParams }: PageProps<"/ordens/nova">) {
  const veiculoId = primeiroValor((await searchParams).veiculoId) ?? "";
  const veiculos = await opcoesVeiculos();

  return (
    <div>
      <Cabecalho
        titulo="Nova ordem de serviço"
        descricao="Registre a entrada do veículo. Peças e serviços são lançados na próxima tela."
      />
      <Cartao>
        {veiculos.length === 0 ? (
          <EstadoVazio acao={{ href: "/veiculos/novo", rotulo: "Cadastrar veículo" }}>
            Cadastre um veículo antes de abrir uma OS.
          </EstadoVazio>
        ) : (
          <FormOrdem acao={criarOrdem} veiculos={veiculos} veiculoId={veiculoId} />
        )}
      </Cartao>
    </div>
  );
}
