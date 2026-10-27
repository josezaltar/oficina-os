"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { classeBotao } from "./ui";

/*
  Exclusão em dois cliques: "Excluir" → "Confirmar exclusão".
  Evita apagar algo sem querer, sem usar o confirm() do navegador.

  `acao` é uma Server Action já com o id "amarrado" via .bind() no servidor,
  por exemplo: excluirCliente.bind(null, cliente.id)
*/
export function BotaoExcluir({
  acao,
  rotulo = "Excluir",
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  rotulo?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, acaoForm] = useActionState(acao, {});

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={classeBotao.secundario}
      >
        {rotulo}
      </button>
    );
  }

  return (
    <form action={acaoForm} className="flex flex-wrap items-center gap-2">
      <BotaoEnviar variante="perigo" enviando="Excluindo...">
        Confirmar exclusão
      </BotaoEnviar>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className={classeBotao.secundario}
      >
        Cancelar
      </button>
      {estado.mensagem && (
        <p role="alert" className="w-full text-sm text-red-600">
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
