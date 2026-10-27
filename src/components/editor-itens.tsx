"use client";
/*
  Editor de itens de uma OS já aberta (página da OS).

  Por que Client Component? Usa useActionState para salvar e mostrar o
  resultado. As linhas em si ficam no <LinhasItens>, o mesmo componente
  da tela de Nova OS.

  Repare: este componente é usado DENTRO de uma página que é Server
  Component (ordens/[id]/page.tsx). O servidor busca os itens no banco e
  passa como props; daqui em diante, o navegador cuida da edição.
  Ao salvar, tudo volta para o servidor, que valida e recalcula o total.
*/
import { useActionState } from "react";
import type { ServicoSugestao } from "@/lib/dados/catalogo";
import type { EstadoForm } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { LinhasItens, type ItemSalvo } from "./linhas-itens";
import { Aviso } from "./ui";

export function EditorItens({
  acao,
  itens,
  sugestoes,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  itens: ItemSalvo[];
  sugestoes: ServicoSugestao[];
}) {
  const [estado, acaoForm] = useActionState(acao, {});

  return (
    <form action={acaoForm}>
      <LinhasItens
        itens={itens}
        linhasVazias={itens.length === 0 ? 1 : 0}
        erros={estado.erros}
        sugestoes={sugestoes}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
        <BotaoEnviar>Salvar itens</BotaoEnviar>
        <Aviso mensagem={estado.mensagem} sucesso={estado.sucesso} />
      </div>
    </form>
  );
}
