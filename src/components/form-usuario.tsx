"use client";
/*
  Formulário de usuário, usado para criar (na lista) e para editar.
  Na edição, a senha é opcional: em branco, a senha atual continua valendo.
*/
import Link from "next/link";
import { useActionState } from "react";
import { criarUsuario } from "@/app/(sistema)/usuarios/acoes";
import { estadoInicial, type EstadoForm } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { Aviso, Campo, Selecao, classeBotao } from "./ui";

export function FormUsuario({
  acao = criarUsuario,
  inicial = {},
  editando = false,
}: {
  acao?: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial?: Record<string, string>;
  editando?: boolean;
}) {
  const [estado, acaoForm] = useActionState(acao, estadoInicial);
  const v = estado.valores ?? inicial;
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
        rotulo={editando ? "Nova senha" : "Senha inicial *"}
        name="senha"
        type="password"
        autoComplete="new-password"
        erros={e.senha}
        dica={editando ? "Deixe em branco para manter a senha atual." : "Mínimo de 8 caracteres."}
      />
      <Selecao rotulo="Papel *" name="papel" defaultValue={v.papel ?? "atendente"} erros={e.papel}>
        <option value="atendente">Atendente</option>
        <option value="gerente">Gerente</option>
      </Selecao>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <BotaoEnviar>{editando ? "Salvar alterações" : "Criar usuário"}</BotaoEnviar>
        {editando && (
          <Link href="/usuarios" className={classeBotao.secundario}>
            Cancelar
          </Link>
        )}
        <Aviso mensagem={estado.mensagem} sucesso={estado.sucesso} />
      </div>
    </form>
  );
}
