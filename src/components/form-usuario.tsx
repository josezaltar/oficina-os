"use client";
import { useActionState } from "react";
import { criarUsuario } from "@/app/(sistema)/usuarios/acoes";
import { estadoInicial } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { Aviso, Campo, Selecao } from "./ui";

export function FormUsuario() {
  const [estado, acaoForm] = useActionState(criarUsuario, estadoInicial);
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};

  return (
    <form
      key={JSON.stringify(estado.valores ?? {}) + String(estado.sucesso)}
      action={acaoForm}
      className="grid gap-4 sm:grid-cols-2"
      noValidate
    >
      <Campo rotulo="Nome *" name="nome" defaultValue={v.nome} erros={e.nome} />
      <Campo rotulo="E-mail *" name="email" type="email" defaultValue={v.email} erros={e.email} />
      <Campo
        rotulo="Senha inicial *"
        name="senha"
        type="password"
        autoComplete="new-password"
        erros={e.senha}
        dica="Mínimo de 8 caracteres."
      />
      <Selecao rotulo="Papel *" name="papel" defaultValue={v.papel ?? "atendente"} erros={e.papel}>
        <option value="atendente">Atendente</option>
        <option value="gerente">Gerente</option>
      </Selecao>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <BotaoEnviar>Criar usuário</BotaoEnviar>
        <Aviso mensagem={estado.mensagem} sucesso={estado.sucesso} />
      </div>
    </form>
  );
}
