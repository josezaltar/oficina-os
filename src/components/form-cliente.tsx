"use client";
/*
  Formulário de cliente (usado no "novo" e no "editar").

  É Client Component porque usa `useActionState`, o hook do React que:
  - chama a Server Action quando o form é enviado;
  - guarda o que ela devolveu (erros, mensagem) em `estado`;
  - informa `pendente` enquanto espera.
*/
import Link from "next/link";
import { useActionState } from "react";
import { estadoInicial, type EstadoForm } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { AreaTexto, Aviso, Campo, classeBotao } from "./ui";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial?: Record<string, string>;
  voltarPara: string;
};

export function FormCliente({ acao, inicial = {}, voltarPara }: Props) {
  const [estado, acaoForm] = useActionState(acao, estadoInicial);

  // Depois de um erro, mostra de volta o que a pessoa digitou.
  const v = estado.valores ?? inicial;
  const e = estado.erros ?? {};

  return (
    /*
      O React limpa o formulário depois de cada envio. A `key` muda quando
      voltam valores com erro, recriando o form já preenchido com eles.
    */
    <form
      key={JSON.stringify(estado.valores ?? {})}
      action={acaoForm}
      className="grid max-w-2xl gap-4 sm:grid-cols-2"
      noValidate
    >
      <div className="sm:col-span-2">
        <Campo rotulo="Nome *" name="nome" defaultValue={v.nome} erros={e.nome} autoComplete="off" />
      </div>
      <Campo
        rotulo="Telefone *"
        name="telefone"
        type="tel"
        defaultValue={v.telefone}
        erros={e.telefone}
        placeholder="(37) 99999-0000"
      />
      <Campo rotulo="E-mail" name="email" type="email" defaultValue={v.email} erros={e.email} />
      <Campo rotulo="CPF ou CNPJ" name="documento" defaultValue={v.documento} erros={e.documento} />
      <div className="sm:col-span-2">
        <AreaTexto rotulo="Observações" name="observacoes" defaultValue={v.observacoes} erros={e.observacoes} />
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <BotaoEnviar>Salvar cliente</BotaoEnviar>
        <Link href={voltarPara} className={classeBotao.secundario}>
          Cancelar
        </Link>
        <Aviso mensagem={estado.mensagem} sucesso={estado.sucesso} />
      </div>
    </form>
  );
}
