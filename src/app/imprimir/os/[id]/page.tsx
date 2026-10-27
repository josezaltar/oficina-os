import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { classeBotao } from "@/components/ui";
import { lerId } from "@/lib/dados/id";
import { buscarOrdem } from "@/lib/dados/ordens";
import { EMPRESA } from "@/lib/empresa";
import {
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarNumero,
  formatarPlaca,
} from "@/lib/formato";
import { ROTULO_STATUS, subtotalCentavos } from "@/lib/regras-os";

export const metadata: Metadata = { title: "Imprimir OS" };

/*
  Página de impressão (etapa 8). Fica FORA do grupo (sistema) para não ter
  o menu lateral: na tela, ela já parece uma folha A4.

  Truques de CSS de impressão usados aqui:
  - `print:hidden` (Tailwind) esconde os botões no papel;
  - `print:shadow-none`/`print:p-0` tiram o "visual de tela" da folha;
  - `break-inside-avoid` evita cortar a tabela ou as assinaturas no meio;
  - o tamanho e a margem da folha estão em @page, no globals.css.
*/
export default async function ImprimirOrdemPage({ params }: PageProps<"/imprimir/os/[id]">) {
  const id = lerId((await params).id);
  const ordem = await buscarOrdem(id);
  if (!ordem) notFound();

  const { veiculo } = ordem;
  const { cliente } = veiculo;
  const pecas = ordem.itens.filter((i) => i.tipo === "peca");
  const servicos = ordem.itens.filter((i) => i.tipo === "servico");

  return (
    <div className="min-h-screen bg-slate-200 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4 print:hidden">
        <Link href={`/ordens/${id}`} className={classeBotao.secundario}>
          Voltar
        </Link>
        <BotaoImprimir />
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-[12mm] text-[13px] text-black shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-black pb-3">
          <div>
            <p className="text-xl font-bold">{EMPRESA.nome}</p>
            {EMPRESA.endereco && <p>{EMPRESA.endereco}</p>}
            {(EMPRESA.telefone || EMPRESA.cnpj) && (
              <p>
                {EMPRESA.telefone}
                {EMPRESA.telefone && EMPRESA.cnpj && " · "}
                {EMPRESA.cnpj && `CNPJ ${EMPRESA.cnpj}`}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">ORDEM DE SERVIÇO</p>
            <p className="text-2xl font-bold">Nº {ordem.id}</p>
            <p>Status: {ROTULO_STATUS[ordem.status]}</p>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-4">
          <Bloco titulo="Cliente">
            <p className="font-semibold">{cliente.nome}</p>
            <p>Tel.: {cliente.telefone}</p>
            {cliente.documento && <p>CPF/CNPJ: {cliente.documento}</p>}
          </Bloco>
          <Bloco titulo="Veículo">
            <p className="font-semibold">
              {veiculo.marca} {veiculo.modelo}
              {veiculo.ano ? ` (${veiculo.ano})` : ""}
            </p>
            <p>Placa: {formatarPlaca(veiculo.placa)}</p>
            {ordem.kmEntrada && <p>Km na entrada: {formatarNumero(ordem.kmEntrada)}</p>}
          </Bloco>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-4">
          <p>Entrada: {formatarDataHora(ordem.abertaEm)}</p>
          {ordem.entregueEm && <p>Entrega: {formatarDataHora(ordem.entregueEm)}</p>}
        </section>

        <Bloco titulo="Problema relatado" className="mt-4">
          <p className="whitespace-pre-line">{ordem.descricaoProblema}</p>
        </Bloco>

        <TabelaItens titulo="Serviços" itens={servicos} />
        <TabelaItens titulo="Peças" itens={pecas} />

        <p className="mt-4 border-t-2 border-black pt-2 text-right text-lg font-bold break-inside-avoid">
          TOTAL: {formatarMoeda(ordem.totalCentavos)}
        </p>

        <footer className="mt-16 grid grid-cols-2 gap-12 text-center break-inside-avoid">
          <div className="border-t border-black pt-1">{EMPRESA.nome}</div>
          <div className="border-t border-black pt-1">
            Cliente: {cliente.nome}
            <br />
            Data: ____/____/______
          </div>
        </footer>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Impresso em {formatarData(new Date())} · Oficina OS
        </p>
      </article>
    </div>
  );
}

function Bloco({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded border border-slate-400 p-2 ${className}`}>
      <p className="mb-1 text-[11px] font-bold tracking-wide text-slate-600 uppercase">{titulo}</p>
      {children}
    </div>
  );
}

function TabelaItens({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { id: number; descricao: string; quantidade: number; valorUnitarioCentavos: number }[];
}) {
  if (itens.length === 0) return null;
  return (
    <section className="mt-4 break-inside-avoid">
      <p className="mb-1 font-bold">{titulo}</p>
      <table className="w-full border-collapse [&_td]:border [&_td]:border-slate-400 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-400 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1">
        <thead>
          <tr>
            <th className="text-left">Descrição</th>
            <th className="w-16 text-right">Qtd.</th>
            <th className="w-28 text-right">Valor unit.</th>
            <th className="w-28 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>{item.descricao}</td>
              <td className="text-right">{formatarNumero(item.quantidade)}</td>
              <td className="text-right">{formatarMoeda(item.valorUnitarioCentavos)}</td>
              <td className="text-right">{formatarMoeda(subtotalCentavos(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
