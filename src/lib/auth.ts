/*
  Autenticação (etapa 7) — a "Camada de Acesso a Dados" (DAL).

  Toda página e toda Server Action que mexe com dados chama exigirUsuario()
  ANTES de tocar no banco. É aqui que a segurança acontece de verdade.

  O proxy.ts também confere o login, mas só para redirecionar rápido para
  /login. Ele é a "portaria"; esta camada é a "fechadura de cada sala".
  Se um dia o proxy tiver um furo, os dados continuam protegidos.

  Por que não Auth.js, como dizia o roteiro? O Auth.js entrou em modo de
  manutenção (o time foi para o Better Auth), e a documentação desta versão
  do Next usa iron-session nos exemplos de login. Para login com e-mail e
  senha de funcionários, iron-session + bcrypt é simples e você entende cada
  linha.
*/
import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import {
  DURACAO_SEGUNDOS,
  NOME_COOKIE,
  abrirSelo,
  selar,
  type DadosSessao,
} from "./selo-sessao";

// ------------------------------------------------------------- cookie

export async function criarSessao(dados: DadosSessao) {
  (await cookies()).set(NOME_COOKIE, await selar(dados), {
    httpOnly: true, // JavaScript do navegador não consegue ler o cookie
    secure: process.env.NODE_ENV === "production", // só via HTTPS em produção
    sameSite: "lax", // protege contra envio por outros sites (CSRF)
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(NOME_COOKIE);
}

// ------------------------------------------------------------- usuário

/*
  `cache` do React: dentro de UMA requisição, várias chamadas a
  obterUsuario() (layout, página, componentes) consultam o banco uma vez só.
*/
export const obterUsuario = cache(async () => {
  const selo = (await cookies()).get(NOME_COOKIE)?.value;
  if (!selo) return null;

  // Abrir o selo confere a validade com o relógio (Date.now()). Com Cache
  // Components, valores que mudam a cada instante só podem ser lidos depois
  // de connection(), que diz ao Next: "isto é calculado na hora do acesso".
  await connection();
  const sessao = await abrirSelo(selo);
  if (!sessao) return null;

  // Confere no banco a cada requisição: se o usuário for removido ou
  // mudar de papel, isso vale na hora, sem esperar o cookie expirar.
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, sessao.usuarioId),
    columns: { id: true, nome: true, email: true, papel: true }, // nunca o hash
  });
  return usuario ?? null;
});

export type Usuario = NonNullable<Awaited<ReturnType<typeof obterUsuario>>>;

/** Garante que há alguém logado. Se não houver, manda para o /login. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Para ações só de gerente (excluir, cadastrar usuários). */
export async function exigirGerente(): Promise<
  { ok: true; usuario: Usuario } | { ok: false; mensagem: string }
> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "gerente") {
    return { ok: false, mensagem: "Apenas gerentes podem fazer isso." };
  }
  return { ok: true, usuario };
}

/**
 * Para consultas do financeiro (contas a pagar, relatório): só gerente.
 * As páginas já mostram "Acesso restrito" para atendente; esta checagem é
 * a garantia final, perto dos dados.
 */
export async function exigirFinanceiro(): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "gerente") redirect("/");
  return usuario;
}
