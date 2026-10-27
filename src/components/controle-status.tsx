"use client";
import { useActionState } from "react";
import type { StatusOs } from "@/db/schema";
import type { EstadoForm } from "@/lib/estado-form";
import { FLUXO_STATUS, ROTULO_STATUS, statusPermitidos } from "@/lib/regras-os";
import { classeBotao } from "./ui";

// Texto do botão de cada transição, pensando no dia a dia da oficina
const ROTULO_AVANCAR: Partial<Record<StatusOs, string>> = {
  em_andamento: "Iniciar serviço",
  pronta: "Marcar como pronta",
  entregue: "Registrar entrega",
};

/*
  Um formulário com vários botões de envio: cada botão manda
  name="para" com o seu value. A Server Action lê qual foi clicado.
  Os botões mostrados vêm de statusPermitidos(), a mesma regra que o
  servidor confere de novo antes de gravar.
*/
export function ControleStatus({
  status,
  acao,
}: {
  status: StatusOs;
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
}) {
  const [estado, acaoForm, pendente] = useActionState(acao, {});
  const permitidos = statusPermitidos(status);
  const posicao = FLUXO_STATUS.indexOf(status);

  return (
    <form action={acaoForm} className="space-y-3">
      {/* Linha do tempo: mostra em que etapa a OS está */}
      <ol className="flex flex-wrap gap-1 text-xs">
        {FLUXO_STATUS.map((s, i) => (
          <li
            key={s}
            aria-current={s === status ? "step" : undefined}
            className={`rounded-full px-2.5 py-1 font-medium ${
              i < posicao
                ? "bg-slate-200 text-slate-600"
                : i === posicao
                  ? "bg-amber-500 text-slate-950"
                  : "bg-white text-slate-400 ring-1 ring-slate-200"
            }`}
          >
            {ROTULO_STATUS[s]}
          </li>
        ))}
      </ol>

      {permitidos.length === 0 ? (
        <p className="text-sm text-slate-600">OS finalizada. O status não muda mais.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {permitidos.map((para) => {
            const avancar = FLUXO_STATUS.indexOf(para) > posicao;
            return (
              <button
                key={para}
                type="submit"
                name="para"
                value={para}
                disabled={pendente}
                className={avancar ? classeBotao.primario : classeBotao.secundario}
              >
                {avancar ? ROTULO_AVANCAR[para] : `Voltar para "${ROTULO_STATUS[para]}"`}
              </button>
            );
          })}
        </div>
      )}

      {estado.mensagem && (
        <p
          aria-live="polite"
          className={`text-sm ${estado.sucesso ? "text-green-700" : "text-red-600"}`}
        >
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
