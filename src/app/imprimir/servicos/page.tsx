import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { classeBotao } from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import { categoriasDeServico, listarTabelaServicos } from "@/lib/dados/servicos";
import { EMPRESA } from "@/lib/empresa";
import { formatarDataHora, formatarMoeda } from "@/lib/formato";

export const metadata: Metadata = { title: "Tabela de serviços" };

/*
  Tabela de serviços para imprimir e consultar no dia a dia.
  Sempre mostra os preços ATUAIS do sistema: mudou um preço na área
  Serviços, é só imprimir de novo. A data de impressão vai no cabeçalho
  para saber qual folha é a mais nova.

  Opções pela URL:
  - ?ordem=categoria  → agrupada por categoria (MOTOR, CAIXA...)
  - ?ordem=alfabetica → tudo em ordem alfabética (padrão, como a tabela antiga)
  - ?categoria=MOTOR  → só uma categoria

  Em várias páginas, o cabeçalho da tabela (<thead>) se repete sozinho em
  cada folha impressa, e as linhas não são cortadas ao meio.
*/
export default async function ImprimirServicosPage({ searchParams }: PageProps<"/imprimir/servicos">) {
  const parametros = await searchParams;
  const porCategoria = primeiroValor(parametros.ordem) === "categoria";
  const categoria = primeiroValor(parametros.categoria);

  await connection(); // a data de impressão é a do momento do acesso
  const [servicos, categorias] = await Promise.all([
    listarTabelaServicos({ categoria }),
    categoriasDeServico(),
  ]);
  const agora = new Date();

  // Agrupa por categoria (sem categoria vai para o fim, como "OUTROS")
  const grupos = porCategoria
    ? [...categorias, null]
        .map((c) => ({ titulo: c ?? "OUTROS", itens: servicos.filter((s) => s.categoria === c) }))
        .filter((g) => g.itens.length > 0)
    : [{ titulo: null, itens: servicos }];

  const link = (mudancas: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valores = { ordem: porCategoria ? "categoria" : undefined, categoria, ...mudancas };
    for (const [k, v] of Object.entries(valores)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/imprimir/servicos?${qs}` : "/imprimir/servicos";
  };

  return (
    <div className="min-h-screen bg-slate-200 py-8 print:min-h-0 print:bg-white print:py-0">
      {/* -------------------------------------------- opções (só na tela) */}
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          <Grupo rotulo="Ordem">
            <Opcao href={link({ ordem: undefined })} ativa={!porCategoria}>
              Alfabética
            </Opcao>
            <Opcao href={link({ ordem: "categoria" })} ativa={porCategoria}>
              Por categoria
            </Opcao>
          </Grupo>
          <label className="flex items-center gap-2 rounded-md bg-white px-2 text-sm shadow-sm">
            <span className="text-slate-500">Categoria</span>
            {/* Lista de links disfarçada de menu: funciona sem JavaScript */}
            <span className="flex flex-wrap gap-1 py-1">
              <Opcao href={link({ categoria: undefined })} ativa={!categoria}>
                Todas
              </Opcao>
              {categorias.map((c) => (
                <Opcao key={c} href={link({ categoria: c })} ativa={categoria === c}>
                  {c}
                </Opcao>
              ))}
            </span>
          </label>
        </div>
        <div className="flex gap-2">
          <Link href="/servicos" className={classeBotao.secundario}>
            Voltar
          </Link>
          <BotaoImprimir />
        </div>
      </div>

      {/* -------------------------------------------- a folha */}
      <article className="mx-auto max-w-[210mm] bg-white p-[12mm] text-[11px] text-black shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-3 flex items-end justify-between border-b-2 border-black pb-2">
          <div>
            <p className="font-serif text-lg font-bold uppercase">{EMPRESA.nome}</p>
            <p className="text-sm font-semibold">
              Tabela de serviços{categoria ? ` · ${categoria}` : ""}
            </p>
          </div>
          <div className="text-right text-[10px] leading-tight">
            <p>
              Impressa em <strong>{formatarDataHora(agora)}</strong>
            </p>
            <p>
              {servicos.length} {servicos.length === 1 ? "serviço" : "serviços"}
            </p>
          </div>
        </header>

        {servicos.length === 0 ? (
          <p className="py-8 text-center text-sm">Nenhum serviço cadastrado.</p>
        ) : (
          <table className="w-full border-collapse [&_td]:border-b [&_td]:border-slate-300 [&_td]:px-1.5 [&_td]:py-[3px] [&_th]:border-b-2 [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 [&_th]:text-left [&_tr]:break-inside-avoid">
            <thead>
              <tr>
                <th className="w-[16mm]">Código</th>
                <th>Descrição</th>
                {!porCategoria && !categoria && <th className="w-[26mm]">Categoria</th>}
                <th className="w-[24mm] text-right!">Preço</th>
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g.titulo ?? "todos"}>
                {g.titulo && (
                  <tr>
                    <td colSpan={3} className="bg-slate-100 pt-2 font-bold tracking-wide">
                      {g.titulo} <span className="font-normal text-slate-600">({g.itens.length})</span>
                    </td>
                  </tr>
                )}
                {g.itens.map((s, i) => (
                  // Linhas zebradas: ajudam a seguir a linha até o preço no papel
                  <tr key={s.id} className={i % 2 ? "bg-slate-50 print:bg-slate-50" : ""}>
                    <td className="font-mono text-[10px]">{s.referencia ?? ""}</td>
                    <td>{s.descricao}</td>
                    {!porCategoria && !categoria && <td className="text-[10px]">{s.categoria ?? ""}</td>}
                    <td className="text-right whitespace-nowrap tabular-nums">
                      {s.precoCentavos != null ? formatarMoeda(s.precoCentavos) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        )}

        <p className="mt-3 text-[9px] text-slate-600">
          Valores de mão de obra sujeitos a alteração. Consulte a versão mais nova no sistema.
        </p>
      </article>
    </div>
  );
}

function Grupo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-white p-1 text-sm shadow-sm" role="group" aria-label={rotulo}>
      {children}
    </div>
  );
}

function Opcao({ href, ativa, children }: { href: string; ativa: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativa ? "true" : undefined}
      className={`rounded px-2.5 py-1 text-xs font-medium ${ativa ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </Link>
  );
}
