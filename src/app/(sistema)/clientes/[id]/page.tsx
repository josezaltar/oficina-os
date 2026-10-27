import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import {
  Cabecalho,
  Cartao,
  EstadoVazio,
  EtiquetaStatus,
  classeBotao,
} from "@/components/ui";
import { buscarCliente } from "@/lib/dados/clientes";
import { lerId } from "@/lib/dados/id";
import { formatarData, formatarMoeda, formatarPlaca } from "@/lib/formato";
import { excluirCliente } from "../acoes";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const id = lerId((await params).id);
  const cliente = await buscarCliente(id);
  // notFound() mostra a página 404 se o id não existir no banco
  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <Cabecalho titulo={cliente.nome} descricao={`Cliente nº ${cliente.id}`}>
        <Link href={`/clientes/${id}/editar`} className={classeBotao.secundario}>
          Editar
        </Link>
        <BotaoExcluir acao={excluirCliente.bind(null, id)} />
      </Cabecalho>

      <Cartao titulo="Dados de contato">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <Info rotulo="Telefone" valor={cliente.telefone} />
          <Info rotulo="E-mail" valor={cliente.email} />
          <Info rotulo="CPF/CNPJ" valor={cliente.documento} />
          {cliente.observacoes && (
            <div className="sm:col-span-3">
              <Info rotulo="Observações" valor={cliente.observacoes} />
            </div>
          )}
        </dl>
      </Cartao>

      <Cartao
        titulo={
          <span className="flex items-center justify-between gap-2">
            Veículos
            <Link
              href={`/veiculos/novo?clienteId=${id}`}
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              + Adicionar veículo
            </Link>
          </span>
        }
      >
        {cliente.veiculos.length === 0 ? (
          <EstadoVazio>Nenhum veículo cadastrado para este cliente.</EstadoVazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cliente.veiculos.map((veiculo) => (
              <li key={veiculo.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/veiculos/${veiculo.id}`} className="font-medium hover:underline">
                    <span className="font-mono">{formatarPlaca(veiculo.placa)}</span>{" "}
                    · {veiculo.marca} {veiculo.modelo}
                    {veiculo.ano ? ` (${veiculo.ano})` : ""}
                  </Link>
                  <Link
                    href={`/ordens/nova?veiculoId=${veiculo.id}`}
                    className="text-sm font-medium text-amber-700 hover:underline"
                  >
                    Abrir OS
                  </Link>
                </div>
                {veiculo.ordens.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {veiculo.ordens.map((ordem) => (
                      <li key={ordem.id} className="flex flex-wrap items-center gap-2">
                        <Link href={`/ordens/${ordem.id}`} className="hover:underline">
                          OS {ordem.id} · {formatarData(ordem.abertaEm)} ·{" "}
                          {formatarMoeda(ordem.totalCentavos)}
                        </Link>
                        <EtiquetaStatus status={ordem.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 whitespace-pre-line font-medium">{valor || "—"}</dd>
    </div>
  );
}
