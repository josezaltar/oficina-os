import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import {
  Cabecalho,
  Cartao,
  EstadoVazio,
  EtiquetaStatus,
  Tabela,
  classeBotao,
} from "@/components/ui";
import { lerId } from "@/lib/dados/id";
import { buscarVeiculo } from "@/lib/dados/veiculos";
import {
  formatarData,
  formatarMoeda,
  formatarNumero,
  formatarPlaca,
} from "@/lib/formato";
import { excluirVeiculo } from "../acoes";

export const metadata: Metadata = { title: "Veículo" };

export default async function VeiculoPage({ params }: PageProps<"/veiculos/[id]">) {
  const id = lerId((await params).id);
  const veiculo = await buscarVeiculo(id);
  if (!veiculo) notFound();

  return (
    <div className="space-y-6">
      <Cabecalho
        titulo={`${veiculo.marca} ${veiculo.modelo}`}
        descricao={
          <>
            <span className="font-mono">{formatarPlaca(veiculo.placa)}</span>
            {veiculo.ano ? ` · ${veiculo.ano}` : ""} · dono:{" "}
            <Link href={`/clientes/${veiculo.cliente.id}`} className="underline">
              {veiculo.cliente.nome}
            </Link>
          </>
        }
      >
        <Link href={`/ordens/nova?veiculoId=${id}`} className={classeBotao.primario}>
          Abrir OS
        </Link>
        <Link href={`/veiculos/${id}/editar`} className={classeBotao.secundario}>
          Editar
        </Link>
        <BotaoExcluir acao={excluirVeiculo.bind(null, id)} />
      </Cabecalho>

      <Cartao titulo="Histórico de ordens de serviço">
        {veiculo.ordens.length === 0 ? (
          <EstadoVazio>Este veículo ainda não passou pela oficina.</EstadoVazio>
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th>OS</th>
                <th>Entrada</th>
                <th className="hidden md:table-cell">Problema</th>
                <th className="hidden sm:table-cell text-right">Km</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {veiculo.ordens.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td>
                    <Link href={`/ordens/${o.id}`} className="font-medium hover:underline">
                      {o.id}
                    </Link>
                  </td>
                  <td>{formatarData(o.abertaEm)}</td>
                  <td className="hidden max-w-xs truncate md:table-cell">{o.descricaoProblema}</td>
                  <td className="hidden text-right sm:table-cell">
                    {o.kmEntrada ? formatarNumero(o.kmEntrada) : "—"}
                  </td>
                  <td>
                    <EtiquetaStatus status={o.status} />
                  </td>
                  <td className="text-right whitespace-nowrap">{formatarMoeda(o.totalCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Cartao>
    </div>
  );
}
