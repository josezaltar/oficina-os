import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { FormUsuario } from "@/components/form-usuario";
import { Cabecalho, Cartao } from "@/components/ui";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { lerId } from "@/lib/dados/id";
import { atualizarUsuario, excluirUsuario } from "../../acoes";

export const metadata: Metadata = { title: "Editar usuário" };

export default async function EditarUsuarioPage({ params }: PageProps<"/usuarios/[id]/editar">) {
  const id = lerId((await params).id);
  const eu = await exigirUsuario();

  if (eu.papel !== "gerente") {
    return (
      <Cartao titulo="Acesso restrito">
        <p className="text-sm text-slate-600">Apenas gerentes podem gerenciar usuários.</p>
      </Cartao>
    );
  }

  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, id),
    columns: { id: true, nome: true, email: true, papel: true }, // nunca o hash
  });
  if (!usuario) notFound();

  return (
    <div>
      <Cabecalho titulo="Editar usuário" descricao={usuario.email}>
        {/* Ninguém exclui a própria conta (a regra também é checada no servidor) */}
        {usuario.id !== eu.id && <BotaoExcluir acao={excluirUsuario.bind(null, id)} />}
      </Cabecalho>
      <Cartao>
        <FormUsuario
          acao={atualizarUsuario.bind(null, id)}
          editando
          inicial={{ nome: usuario.nome, email: usuario.email, papel: usuario.papel }}
        />
      </Cartao>
    </div>
  );
}
