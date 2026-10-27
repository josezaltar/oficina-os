"use client";
/*
  Tabela de itens da OS, no formato do bloco: Unid. | Descrição | Preço Unit. | Total.
  É uma lista DINÂMICA de linhas (useState): adicionar, remover e recalcular
  o total a cada tecla acontece no navegador.

  Ela NÃO tem <form> próprio: é usada dentro de outros formulários
  (a Nova OS e o editor de itens da página da OS). Cada linha manda os
  campos repetidos tipo, descricao, quantidade e valor; o servidor junta
  pela posição (veja lerItens em ordens/acoes.ts).

  Linhas totalmente em branco não são enviadas: como no papel, pode sobrar
  linha vazia sem dar erro.

  A oficina lança só SERVIÇOS: o tipo vai escondido como "servico".
  Os serviços cadastrados (área Serviços) aparecem como sugestão
  (<datalist>) enquanto se digita, com o código e o preço ao lado.
  Escolher um serviço preenche o Preço Unit. (se ainda estiver vazio).
  Ao salvar, descrições novas entram no cadastro, sem repetir.
*/
import { useState } from "react";
import type { TipoItem } from "@/db/schema";
import type { ServicoSugestao } from "@/lib/dados/catalogo";
import {
  centavosParaCampo,
  formatarMoeda,
  lerMoedaEmCentavos,
  lerNumeroBr,
} from "@/lib/formato";
import { subtotalCentavos } from "@/lib/regras-os";
import { classeBotao } from "./ui";

type Linha = {
  chave: string; // identidade da linha para o React (não vai para o banco)
  tipo: TipoItem;
  descricao: string;
  quantidade: string; // texto, do jeito que a pessoa digita ("2,5")
  valor: string; // texto ("1.234,56")
};

export type ItemSalvo = {
  id: number;
  tipo: TipoItem;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
};

let contador = 0;
const novaChave = () => `nova-${++contador}`;

const linhaVazia = (tipo: TipoItem = "servico"): Linha => ({
  chave: novaChave(),
  tipo,
  descricao: "",
  quantidade: "1",
  valor: "",
});

/** Linha em branco: sem descrição e sem valor (a quantidade "1" não conta). */
const emBranco = (l: Linha) => l.descricao.trim() === "" && l.valor.trim() === "";

/** Prévia do subtotal: se algo estiver inválido, conta como zero. */
function previaCentavos(linha: Linha) {
  const quantidade = lerNumeroBr(linha.quantidade);
  const valor = lerMoedaEmCentavos(linha.valor);
  if (Number.isNaN(quantidade) || Number.isNaN(valor)) return 0;
  // Mesma função que o servidor usa: a prévia bate com o valor final
  return subtotalCentavos({ quantidade, valorUnitarioCentavos: valor });
}

const classeEntrada =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none aria-invalid:border-red-500";

export function LinhasItens({
  itens = [],
  linhasVazias = 0,
  erros = {},
  sugestoes = [],
}: {
  itens?: ItemSalvo[];
  /** serviços cadastrados, com preço de tabela */
  sugestoes?: ServicoSugestao[];
  /** quantas linhas em branco mostrar no começo (como as linhas do papel) */
  linhasVazias?: number;
  /** erros do servidor, no formato "2.descricao" (linha enviada nº 2) */
  erros?: Record<string, string[] | undefined>;
}) {
  // Estado inicial: os itens que vieram do banco, convertidos para texto
  const [linhas, setLinhas] = useState<Linha[]>(() => [
    ...itens.map((item) => ({
      chave: `item-${item.id}`,
      tipo: item.tipo,
      descricao: item.descricao,
      quantidade: String(item.quantidade).replace(".", ","),
      valor: centavosParaCampo(item.valorUnitarioCentavos),
    })),
    ...Array.from({ length: linhasVazias }, () => linhaVazia()),
  ]);

  // Atualiza um campo de uma linha sem mexer nas outras (imutabilidade)
  function alterar(chave: string, campo: keyof Linha, valor: string) {
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  }

  // Busca rápida do serviço pela descrição (sem diferenciar maiúsculas)
  const porDescricao = new Map(sugestoes.map((s) => [s.descricao.toLowerCase(), s]));

  /** Mudou a descrição: se é um serviço cadastrado com preço, preenche o preço. */
  function alterarDescricao(chave: string, descricao: string) {
    const servico = porDescricao.get(descricao.trim().toLowerCase());
    setLinhas((atuais) =>
      atuais.map((l) => {
        if (l.chave !== chave) return l;
        const precoVazio = l.valor.trim() === "";
        return {
          ...l,
          descricao,
          valor:
            servico?.precoCentavos != null && precoVazio
              ? centavosParaCampo(servico.precoCentavos)
              : l.valor,
        };
      }),
    );
  }

  function remover(chave: string) {
    setLinhas((atuais) => atuais.filter((l) => l.chave !== chave));
  }

  const total = linhas.reduce((soma, l) => soma + previaCentavos(l), 0);

  // Posição de cada linha entre as ENVIADAS (as em branco não contam),
  // para ligar os erros do servidor à linha certa da tela
  let enviadas = 0;
  const posicaoEnviada = linhas.map((l) => (emBranco(l) ? -1 : enviadas++));

  return (
    <div>
      {/* `relative`: sem ele, o texto sr-only (position: absolute) "escapa"
          da área de rolagem e faz a página inteira rolar para o lado no celular */}
      <div className="relative overflow-x-auto rounded-md border border-slate-300">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700 [&_th]:border-b [&_th]:border-slate-300 [&_th]:px-2 [&_th]:py-2 [&_th]:font-semibold">
              <th className="w-20 text-left">Unid.</th>
              <th className="text-left">Descrição</th>
              <th className="w-32 text-left">Preço Unit.</th>
              <th className="w-32 text-right">Total</th>
              <th className="w-10">
                <span className="sr-only">Remover</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => {
              const n = i + 1;
              const pos = posicaoEnviada[i];
              const erro = (campo: string) => (pos >= 0 ? erros[`${pos}.${campo}`] : undefined);
              // Linha em branco fica sem `name`: não vai para o servidor
              const nome = (campo: string) => (pos >= 0 ? campo : undefined);
              return (
                // key estável (não o índice!): ao remover a linha 2, o React
                // sabe exatamente qual sumiu e não embaralha os campos.
                <tr key={linha.chave} className="border-b border-slate-200 align-top last:border-0">
                  <td className="px-2 py-1">
                    <input
                      name={nome("quantidade")}
                      inputMode="decimal"
                      aria-label={`Quantidade do item ${n}`}
                      value={linha.quantidade}
                      onChange={(e) => alterar(linha.chave, "quantidade", e.target.value)}
                      aria-invalid={erro("quantidade") ? true : undefined}
                      className={classeEntrada}
                    />
                    <ErroLinha erros={erro("quantidade")} />
                  </td>
                  <td className="px-2 py-1">
                    {/* Tipo escondido: a oficina só lança serviços */}
                    <input type="hidden" name={nome("tipo")} value={linha.tipo} />
                    <input
                      name={nome("descricao")}
                      list="sugestoes-servico"
                      autoComplete="off"
                      aria-label={`Descrição do item ${n}`}
                      value={linha.descricao}
                      onChange={(e) => alterarDescricao(linha.chave, e.target.value)}
                      aria-invalid={erro("descricao") ? true : undefined}
                      className={classeEntrada}
                      placeholder="Ex.: Regulagem de freio"
                    />
                    <ErroLinha erros={erro("descricao")} />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      name={nome("valor")}
                      inputMode="decimal"
                      aria-label={`Valor unitário do item ${n}`}
                      value={linha.valor}
                      onChange={(e) => alterar(linha.chave, "valor", e.target.value)}
                      aria-invalid={erro("valorUnitarioCentavos") ? true : undefined}
                      className={classeEntrada}
                      placeholder="0,00"
                    />
                    <ErroLinha erros={erro("valorUnitarioCentavos")} />
                  </td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                    {emBranco(linha) ? "" : formatarMoeda(previaCentavos(linha))}
                  </td>
                  <td className="py-1 pr-1 text-right">
                    <button
                      type="button"
                      onClick={() => remover(linha.chave)}
                      aria-label={`Remover item ${n}`}
                      className="rounded-md px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td colSpan={3} className="px-2 py-3 text-right font-bold tracking-wide">
                TOTAL
              </td>
              <td className="px-2 py-3 text-right text-base font-bold whitespace-nowrap tabular-nums">
                <span data-testid="total-previa">{formatarMoeda(total)}</span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* No celular a coluna Total fica fora da tela (a tabela rola para o
          lado), então o total também aparece aqui embaixo */}
      <p className="mt-2 text-right text-base font-bold sm:hidden">
        TOTAL: {formatarMoeda(total)}
      </p>

      <datalist id="sugestoes-servico">
        {sugestoes.map((s) => (
          // label: aparece ao lado da descrição na lista (código, preço, categoria)
          <option
            key={s.descricao}
            value={s.descricao}
            label={[
              s.referencia,
              s.precoCentavos != null ? formatarMoeda(s.precoCentavos) : null,
              s.categoria,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
      </datalist>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setLinhas((l) => [...l, linhaVazia()])}
          className={classeBotao.secundario}
        >
          + Adicionar linha
        </button>
      </div>
    </div>
  );
}

function ErroLinha({ erros }: { erros?: string[] }) {
  if (!erros?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{erros.join(" ")}</p>;
}
