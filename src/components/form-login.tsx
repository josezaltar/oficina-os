"use client";
import { useActionState } from "react";
import { entrar } from "@/app/login/acoes";
import { estadoInicial } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { Aviso, Campo } from "./ui";

export function FormLogin({ de }: { de?: string }) {
  const [estado, acaoForm] = useActionState(entrar, estadoInicial);
  const e = estado.erros ?? {};

  return (
    <form key={JSON.stringify(estado.valores ?? {})} action={acaoForm} className="space-y-4" noValidate>
      {/* Página que a pessoa queria abrir antes de ser mandada ao login */}
      {de && <input type="hidden" name="de" value={de} />}
      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        defaultValue={estado.valores?.email}
        erros={e.email}
      />
      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        erros={e.senha}
      />
      <div className="space-y-2">
        <BotaoEnviar enviando="Entrando...">Entrar</BotaoEnviar>
        <Aviso mensagem={estado.mensagem} />
      </div>
    </form>
  );
}
