import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { classeBotao } from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import { lerId } from "@/lib/dados/id";
import { buscarOrdem, cabecalhoDaOrdem } from "@/lib/dados/ordens";
import { EMPRESA } from "@/lib/empresa";
import { formatarData, formatarMoeda, formatarNumero, formatarPlaca } from "@/lib/formato";
import { subtotalCentavos } from "@/lib/regras-os";

export const metadata: Metadata = { title: "Imprimir OS" };

/*
  Página de impressão no MESMO formato do bloco de papel da oficina.

  Dois jeitos de imprimir (escolhidos pela URL, ?vias=1 ou ?vias=2):
  - 2 vias (padrão): a OS sai duas vezes na mesma folha A4, uma em cada
    metade, com linha de corte. Uma via fica na oficina, a outra com o
    cliente, e as duas podem ser assinadas;
  - 1 via: a folha inteira, para OS com muitos itens.

  Cada via de meia folha cabe até MAX_ITENS_MEIA_FOLHA itens. Acima disso,
  a página usa a folha inteira sozinha, para nada ficar cortado.

  Fica FORA do grupo (sistema) para não ter o menu lateral.
  - `print:hidden` (Tailwind) esconde os botões no papel;
  - o tamanho e a margem da folha estão em @page, no globals.css (A4, 12mm).
*/
const MAX_ITENS_MEIA_FOLHA = 12;

export default async function ImprimirOrdemPage({
  params,
  searchParams,
}: PageProps<"/imprimir/os/[id]">) {
  const id = lerId((await params).id);
  const pedidoVias = primeiroValor((await searchParams).vias);
  const ordem = await buscarOrdem(id);
  if (!ordem) notFound();

  const cabeEmMeiaFolha = ordem.itens.length <= MAX_ITENS_MEIA_FOLHA;
  const duasVias = cabeEmMeiaFolha && pedidoVias !== "1";

  return (
    <div className="min-h-screen bg-slate-200 py-8 print:min-h-0 print:bg-white print:py-0">
      {/* -------------------------------------------- barra (só na tela) */}
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <div className="flex gap-1 rounded-md bg-white p-1 text-sm shadow-sm" role="group" aria-label="Formato">
          <OpcaoVias href={`/imprimir/os/${id}?vias=2`} ativa={duasVias} desativada={!cabeEmMeiaFolha}>
            2 vias na folha
          </OpcaoVias>
          <OpcaoVias href={`/imprimir/os/${id}?vias=1`} ativa={!duasVias}>
            1 via (folha inteira)
          </OpcaoVias>
        </div>
        <div className="flex gap-2">
          <Link href={`/ordens/${id}`} className={classeBotao.secundario}>
            Voltar
          </Link>
          <BotaoImprimir />
        </div>
        {!cabeEmMeiaFolha && (
          <p className="w-full text-sm text-slate-600">
            Esta OS tem {ordem.itens.length} itens: só cabe na folha inteira.
          </p>
        )}
      </div>

      {/* -------------------------------------------- a folha A4 */}
      <div className="mx-auto max-w-[210mm] bg-white p-[12mm] text-black shadow-lg print:max-w-none print:p-0 print:shadow-none">
        {duasVias ? (
          <>
            <Via ordem={ordem} compacta rotuloVia="1ª via · Oficina" />
            {/* Linha de corte entre as duas metades */}
            <div className="my-[3mm] flex items-center gap-2 text-[9px] text-slate-500" aria-hidden="true">
              <span>✂</span>
              <span className="flex-1 border-t border-dashed border-slate-500" />
            </div>
            <Via ordem={ordem} compacta rotuloVia="2ª via · Cliente" />
          </>
        ) : (
          <Via ordem={ordem} />
        )}
      </div>
    </div>
  );
}

function OpcaoVias({
  href,
  ativa,
  desativada = false,
  children,
}: {
  href: string;
  ativa: boolean;
  desativada?: boolean;
  children: ReactNode;
}) {
  if (desativada) {
    return <span className="rounded px-3 py-1.5 text-slate-400">{children}</span>;
  }
  return (
    <Link
      href={href}
      aria-current={ativa ? "true" : undefined}
      className={`rounded px-3 py-1.5 font-medium ${ativa ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </Link>
  );
}

type Ordem = NonNullable<Awaited<ReturnType<typeof buscarOrdem>>>;

/*
  Uma via da OS.
  - compacta: meia folha A4 (altura fixa de 128mm: a folha tem 273mm úteis
    depois das margens; sobram ~17mm de folga para a linha de corte e para
    diferenças entre impressoras). Quadro do cliente em 4 linhas e menos linhas
    vazias na tabela;
  - normal: folha inteira, igual ao bloco.
*/
function Via({ ordem, compacta = false, rotuloVia }: { ordem: Ordem; compacta?: boolean; rotuloVia?: string }) {
  const b = cabecalhoDaOrdem(ordem);
  const linhasDaTabela = compacta ? MAX_ITENS_MEIA_FOLHA : 18;
  const vazias = Math.max(0, linhasDaTabela - ordem.itens.length);

  return (
    <article
      className={`flex flex-col ${compacta ? "h-[128mm] text-[10.5px]" : "text-[12px]"}`}
      data-testid="via"
    >
      {/* ------------------------------------------ cabeçalho da empresa */}
      <header className={`relative text-center ${compacta ? "pb-1" : "pb-2"}`}>
        <p className="absolute top-0 right-0 text-right leading-tight">
          OS nº <strong className={compacta ? "text-sm" : "text-base"}>{ordem.id}</strong>
          {rotuloVia && <span className="block text-[9px] text-slate-600">{rotuloVia}</span>}
        </p>
        <p className={`font-serif font-bold tracking-wide uppercase ${compacta ? "text-lg" : "text-2xl"}`}>
          {EMPRESA.nome}
        </p>
        {compacta ? (
          // Meia folha: especialidade e direção numa linha só
          <p className="font-serif text-[11px] font-semibold">
            {[EMPRESA.especialidade, EMPRESA.direcao].filter(Boolean).join(" · ")}
          </p>
        ) : (
          <>
            {EMPRESA.especialidade && <p className="font-serif text-base font-semibold">{EMPRESA.especialidade}</p>}
            {EMPRESA.direcao && <p className="font-serif text-sm">{EMPRESA.direcao}</p>}
          </>
        )}
        <p className={`font-semibold ${compacta ? "text-[10px]" : "mt-1 text-sm"}`}>
          {[EMPRESA.telefones, compacta ? EMPRESA.endereco : ""].filter(Boolean).join(" · ")}
        </p>
        {!compacta && EMPRESA.endereco && <p className="text-sm font-semibold">{EMPRESA.endereco}</p>}
        {EMPRESA.cnpj && <p className="text-xs">CNPJ {EMPRESA.cnpj}</p>}
      </header>

      {/* ------------------------------------------ quadro do cliente */}
      <section className="rounded-md border border-black">
        {compacta ? (
          <>
            <LinhaQuadro>
              <CampoQuadro rotulo="Nome" valor={b.nome} className="flex-[3]" compacta />
              <CampoQuadro rotulo="Data" valor={formatarData(ordem.abertaEm)} className="flex-1" compacta />
            </LinhaQuadro>
            <LinhaQuadro>
              <CampoQuadro rotulo="Cidade" valor={b.cidade} className="flex-[3]" compacta />
              <CampoQuadro rotulo="CEP" valor={b.cep} className="flex-[2]" compacta />
              <CampoQuadro rotulo="Nº" valor={b.numero} className="flex-1" compacta />
            </LinhaQuadro>
            <LinhaQuadro>
              <CampoQuadro rotulo="Marca" valor={b.marca} className="flex-[2]" compacta />
              <CampoQuadro rotulo="Modelo" valor={b.modelo} className="flex-[2]" compacta />
              <CampoQuadro rotulo="Tipo" valor={b.tipo} className="flex-[2]" compacta />
            </LinhaQuadro>
            <LinhaQuadro ultima>
              <CampoQuadro rotulo="Tel" valor={b.telefone} className="flex-1" compacta />
              <CampoQuadro rotulo="Placa" valor={formatarPlaca(b.placa)} className="flex-1" compacta />
            </LinhaQuadro>
          </>
        ) : (
          <>
            <LinhaQuadro>
              <CampoQuadro rotulo="Nome" valor={b.nome} className="flex-[3]" />
              <CampoQuadro rotulo="Data" valor={formatarData(ordem.abertaEm)} className="flex-1" />
            </LinhaQuadro>
            <LinhaQuadro>
              <CampoQuadro rotulo="Cidade" valor={b.cidade} className="flex-1" />
            </LinhaQuadro>
            <LinhaQuadro>
              <CampoQuadro rotulo="Marca" valor={b.marca} className="flex-[3]" />
              <CampoQuadro rotulo="CEP" valor={b.cep} className="flex-[2]" />
              <CampoQuadro rotulo="Nº" valor={b.numero} className="flex-1" />
            </LinhaQuadro>
            <LinhaQuadro>
              <CampoQuadro rotulo="Modelo" valor={b.modelo} className="flex-1" />
            </LinhaQuadro>
            <LinhaQuadro>
              <CampoQuadro rotulo="Tipo" valor={b.tipo} className="flex-1" />
            </LinhaQuadro>
            <LinhaQuadro ultima>
              <CampoQuadro rotulo="Tel" valor={b.telefone} className="flex-1" />
              <CampoQuadro rotulo="Placa" valor={formatarPlaca(b.placa)} className="flex-1" />
            </LinhaQuadro>
          </>
        )}
      </section>

      {/* ------------------------------------------ itens */}
      <table
        className={`mt-1.5 w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-2 [&_th]:border [&_th]:border-black [&_th]:px-2 [&_th]:font-normal ${
          compacta ? "[&_td]:py-0 [&_td]:leading-[1.45] [&_th]:py-0.5" : "[&_td]:py-[3px] [&_th]:py-1"
        }`}
      >
        <thead>
          <tr>
            <th className="w-14">Unid.</th>
            <th>Descrição</th>
            <th className="w-24">Preço Unit.</th>
            <th className="w-24">Total</th>
          </tr>
        </thead>
        <tbody>
          {ordem.itens.map((item) => (
            <tr key={item.id}>
              <td className="text-center">{formatarNumero(item.quantidade)}</td>
              <td>{item.descricao}</td>
              <td className="text-right whitespace-nowrap">{formatarMoeda(item.valorUnitarioCentavos)}</td>
              <td className="text-right whitespace-nowrap">{formatarMoeda(subtotalCentavos(item))}</td>
            </tr>
          ))}
          {/* Linhas vazias, como no papel */}
          {Array.from({ length: vazias }, (_, i) => (
            <tr key={`vazia-${i}`} aria-hidden="true">
              <td>&nbsp;</td>
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      {/* ------------------------------------------ assinatura e total */}
      <footer className={`flex gap-2 break-inside-avoid ${compacta ? "mt-auto pt-1.5" : "mt-2"}`}>
        <div
          className={`flex flex-1 items-end justify-center rounded-md border border-black px-4 pb-1 ${compacta ? "pt-6" : "pt-8"}`}
        >
          <div className="w-4/5 border-t border-black pt-0.5 text-center text-[9px] uppercase">
            Assinatura do(s) comprador(es)
          </div>
        </div>
        <div className="flex w-[52mm] items-center rounded-md border border-black">
          <span className={`flex-1 self-stretch border-r border-black px-2 text-center font-bold ${compacta ? "py-3" : "py-4"} flex items-center justify-center`}>
            TOTAL
          </span>
          <span className="flex-1 px-2 text-right text-sm font-bold whitespace-nowrap" data-testid="total-impresso">
            {formatarMoeda(ordem.totalCentavos)}
          </span>
        </div>
      </footer>
    </article>
  );
}

function LinhaQuadro({ children, ultima = false }: { children: ReactNode; ultima?: boolean }) {
  return <div className={`flex ${ultima ? "" : "border-b border-black"}`}>{children}</div>;
}

function CampoQuadro({
  rotulo,
  valor,
  className = "",
  compacta = false,
}: {
  rotulo: string;
  valor: string | null;
  className?: string;
  compacta?: boolean;
}) {
  return (
    <div
      className={`border-r border-black px-1.5 last:border-r-0 ${compacta ? "min-h-[24px] py-px" : "min-h-[30px] py-0.5"} ${className}`}
    >
      <span className="block text-[8px] leading-none uppercase">{rotulo}</span>
      <span className={`block leading-tight font-medium ${compacta ? "text-[11px]" : "text-[13px]"}`}>
        {valor || ""}
      </span>
    </div>
  );
}
