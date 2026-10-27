"use client";
import { classeBotao } from "./ui";

// window.print() só existe no navegador, por isso este botão é Client Component.
export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={classeBotao.primario}>
      Imprimir
    </button>
  );
}
