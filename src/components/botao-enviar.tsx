"use client";

import { useFormStatus } from "react-dom";
import { classeBotao } from "./ui";

/*
  Botão de envio que se desabilita sozinho enquanto o formulário é enviado.
  `useFormStatus` lê o estado do <form> PAI, por isso ele precisa ser um
  componente separado, dentro do form. Evita clique duplo (OS duplicada!).
*/
export function BotaoEnviar({
  children,
  enviando = "Salvando...",
  variante = "primario",
}: {
  children: React.ReactNode;
  enviando?: string;
  variante?: keyof typeof classeBotao;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={classeBotao[variante]}>
      {pending ? enviando : children}
    </button>
  );
}
