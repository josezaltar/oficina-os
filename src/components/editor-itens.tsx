"use client";
/*
  Editor de itens da OS (etapa 6): uma lista DINÂMICA de linhas.

  Por que Client Component? Adicionar e remover linhas, e recalcular a
  prévia do total a cada tecla, é interação no navegador (useState).

  Mas repare: este componente é usado DENTRO de uma página que é Server
  Component (ordens/[id]/page.tsx). O servidor busca os itens no banco e
  passa como props; daqui em diante, o navegador cuida da edição.
  Ao salvar, tudo volta para o servidor, que valida e recalcula o total.
*/
import { useActionState, useState } from "react";
import type { TipoItem } from "@/db/schema";
import type { EstadoForm } from "@/lib/estado-form";
import {
  centavosParaCampo,
  formatarMoeda,
  lerMoedaEmCentavos,
  lerNumeroBr,
} from "@/lib/formato";
import { subtotalCentavos } from "@/lib/regras-os";
import { BotaoEnviar } from "./botao-enviar";
import { Aviso, classeBotao } from "./ui";

type Linha = {
  chave: string; // identidade da linha para o React (não vai para o banco)
  tipo: TipoItem;
  descricao: string;
  quantidade: string; // texto, do jeito que a pessoa digita ("2,5")
  valor: string; // texto ("1.234,56")
};

type ItemSalvo = {
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

export function EditorItens({
  acao,
  itens,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  itens: ItemSalvo[];
}) {
  const [estado, acaoForm] = useActionState(acao, {});

  // Estado inicial: os itens que vieram do banco, convertidos para texto
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    itens.map((item) => ({
      chave: `item-${item.id}`,
      tipo: item.tipo,
      descricao: item.descricao,
      quantidade: String(item.quantidade).replace(".", ","),
      valor: centavosParaCampo(item.valorUnitarioCentavos),
    })),
  );

  // Atualiza um campo de uma linha sem mexer nas outras (imutabilidade)
  function alterar(chave: string, campo: keyof Linha, valor: string) {
    setLinhas((atuais) =>
      atuais.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)),
    );
  }

  function remover(chave: string) {
    setLinhas((atuais) => atuais.filter((l) => l.chave !== chave));
  }

  const total = linhas.reduce((soma, l) => soma + previaCentavos(l), 0);
  const erros = estado.erros ?? {};
  const erroDaLinha = (i: number, campo: string) => erros[`${i}.${campo}`];

  return (
    <form action={acaoForm}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="w-32 pb-2 font-semibold">Tipo</th>
              <th className="pb-2 font-semibold">Descrição</th>
              <th className="w-24 pb-2 font-semibold">Qtd.</th>
              <th className="w-32 pb-2 font-semibold">Valor unit. (R$)</th>
              <th className="w-32 pb-2 text-right font-semibold">Subtotal</th>
              <th className="w-10 pb-2">
                <span className="sr-only">Remover</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => (
              // key estável (não o índice!): ao remover a linha 2, o React
              // sabe exatamente qual sumiu e não embaralha os campos.
              <tr key={linha.chave} className="align-top">
                <td className="py-1 pr-2">
                  <select
                    name="tipo"
                    aria-label={`Tipo do item ${i + 1}`}
                    value={linha.tipo}
                    onChange={(e) => alterar(linha.chave, "tipo", e.target.value)}
                    className={classeEntrada}
                  >
                    <option value="servico">Serviço</option>
                    <option value="peca">Peça</option>
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <input
                    name="descricao"
                    aria-label={`Descrição do item ${i + 1}`}
                    value={linha.descricao}
                    onChange={(e) => alterar(linha.chave, "descricao", e.target.value)}
                    aria-invalid={erroDaLinha(i, "descricao") ? true : undefined}
                    className={classeEntrada}
                    placeholder="Ex.: Troca de óleo"
                  />
                  <ErroLinha erros={erroDaLinha(i, "descricao")} />
                </td>
                <td className="py-1 pr-2">
                  <input
                    name="quantidade"
                    inputMode="decimal"
                    aria-label={`Quantidade do item ${i + 1}`}
                    value={linha.quantidade}
                    onChange={(e) => alterar(linha.chave, "quantidade", e.target.value)}
                    aria-invalid={erroDaLinha(i, "quantidade") ? true : undefined}
                    className={classeEntrada}
                  />
                  <ErroLinha erros={erroDaLinha(i, "quantidade")} />
                </td>
                <td className="py-1 pr-2">
                  <input
                    name="valor"
                    inputMode="decimal"
                    aria-label={`Valor unitário do item ${i + 1}`}
                    value={linha.valor}
                    onChange={(e) => alterar(linha.chave, "valor", e.target.value)}
                    aria-invalid={erroDaLinha(i, "valorUnitarioCentavos") ? true : undefined}
                    className={classeEntrada}
                    placeholder="0,00"
                  />
                  <ErroLinha erros={erroDaLinha(i, "valorUnitarioCentavos")} />
                </td>
                <td className="py-2.5 pr-2 text-right whitespace-nowrap">
                  {formatarMoeda(previaCentavos(linha))}
                </td>
                <td className="py-1 text-right">
                  <button
                    type="button"
                    onClick={() => remover(linha.chave)}
                    aria-label={`Remover item ${i + 1}`}
                    className="rounded-md px-2 py-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {linhas.length === 0 && (
        <p className="py-4 text-sm text-slate-500">
          Nenhum item lançado. Adicione os serviços e as peças usadas.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setLinhas((l) => [...l, linhaVazia("servico")])}
          className={classeBotao.secundario}
        >
          + Serviço
        </button>
        <button
          type="button"
          onClick={() => setLinhas((l) => [...l, linhaVazia("peca")])}
          className={classeBotao.secundario}
        >
          + Peça
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <BotaoEnviar>Salvar itens</BotaoEnviar>
          <Aviso mensagem={estado.mensagem} sucesso={estado.sucesso} />
        </div>
        <p className="text-lg">
          Total: <strong data-testid="total-previa">{formatarMoeda(total)}</strong>
        </p>
      </div>
    </form>
  );
}

function ErroLinha({ erros }: { erros?: string[] }) {
  if (!erros?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{erros.join(" ")}</p>;
}
