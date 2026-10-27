import type { Metadata } from "next";
import Link from "next/link";
import { FormBusca } from "@/components/form-busca";
import {
  Cabecalho,
  EstadoVazio,
  EtiquetaStatus,
  Tabela,
  classeBotao,
} from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import { lerStatus, listarOrdens } from "@/lib/dados/ordens";
import { formatarData, formatarMoeda, formatarPlaca } from "@/lib/formato";
import { FLUXO_STATUS, ROTULO_STATUS } from "@/lib/regras-os";

export const metadata: Metadata = { title: "Ordens de serviço" };

export default async function OrdensPage({ searchParams }: PageProps<"/ordens">) {
  const parametros = await searchParams;
  const busca = primeiroValor(parametros.busca);
  const status = lerStatus(primeiroValor(parametros.status));
  const lista = await listarOrdens({ status, busca });

  // Monta o link de cada aba mantendo a busca atual
  const linkFiltro = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (busca) p.set("busca", busca);
    const qs = p.toString();
    return qs ? `/ordens?${qs}` : "/ordens";
  };

  return (
    <div>
      <Cabecalho titulo="Ordens de serviço">
        <Link href="/ordens/nova" className={classeBotao.primario}>
          Nova OS
        </Link>
      </Cabecalho>

      {/* Abas de status: cada uma é só um link com ?status= */}
      <nav aria-label="Filtrar por status" className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...FLUXO_STATUS].map((s) => {
          const ativo = s === status;
          return (
            <Link
              key={s ?? "todas"}
              href={linkFiltro(s)}
              aria-current={ativo ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                ativo
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {s ? ROTULO_STATUS[s] : "Todas"}
            </Link>
          );
        })}
      </nav>

      <FormBusca action="/ordens" valor={busca} placeholder="Nº da OS, placa ou cliente" />

      {lista.length === 0 ? (
        <EstadoVazio
          acao={!busca && !status ? { href: "/ordens/nova", rotulo: "Abrir a primeira OS" } : undefined}
        >
          Nenhuma ordem de serviço encontrada.
        </EstadoVazio>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <th>OS</th>
              <th>Entrada</th>
              <th>Veículo</th>
              <th className="hidden lg:table-cell">Cliente</th>
              <th>Status</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td>
                  <Link href={`/ordens/${o.id}`} className="font-semibold hover:underline">
                    {o.id}
                  </Link>
                </td>
                <td className="whitespace-nowrap">{formatarData(o.abertaEm)}</td>
                <td>
                  <span className="font-mono">{formatarPlaca(o.placa)}</span>
                  <span className="block text-xs text-slate-500">{o.veiculo}</span>
                </td>
                <td className="hidden lg:table-cell">{o.clienteNome}</td>
                <td>
                  <EtiquetaStatus status={o.status} />
                </td>
                <td className="text-right whitespace-nowrap">{formatarMoeda(o.totalCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  );
}
