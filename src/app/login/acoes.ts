"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { criarSessao, encerrarSessao } from "@/lib/auth";
import { errosDoZod, type EstadoForm } from "@/lib/estado-form";
import { conferirSenha } from "@/lib/senha";
import { esquemaLogin } from "@/lib/validacao";

/*
  Para onde ir depois do login. Só aceitamos caminhos internos ("/ordens/3").
  Sem essa checagem, um link malicioso como /login?de=https://site-falso.com
  levaria o funcionário para fora do sistema logo depois de digitar a senha
  (o famoso "open redirect").
*/
function destinoSeguro(de: FormDataEntryValue | null) {
  return typeof de === "string" && de.startsWith("/") && !de.startsWith("//")
    ? de
    : "/";
}

export async function entrar(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "");
  const resultado = esquemaLogin.safeParse({
    email,
    senha: formData.get("senha") ?? "",
  });
  if (!resultado.success) return errosDoZod(resultado.error, { email });

  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, resultado.data.email),
  });

  const senhaOk =
    usuario && (await conferirSenha(resultado.data.senha, usuario.senhaHash));

  if (!usuario || !senhaOk) {
    // Mensagem genérica de propósito: não contamos se foi o e-mail ou a
    // senha que errou, para não ajudar quem tenta adivinhar contas.
    return { mensagem: "E-mail ou senha incorretos.", valores: { email } };
  }

  await criarSessao({ usuarioId: usuario.id, papel: usuario.papel });
  redirect(destinoSeguro(formData.get("de")));
}

/** Botão "Entrar como demonstração" (etapa 10). Só funciona com DEMO_MODE=true. */
export async function entrarDemo(formData: FormData) {
  if (process.env.DEMO_MODE !== "true") redirect("/login");

  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, "gerente@oficina.dev"),
  });
  if (!usuario) {
    throw new Error("Conta demo não encontrada. Rode o seed: npm run db:seed -- --sim");
  }

  await criarSessao({ usuarioId: usuario.id, papel: usuario.papel });
  redirect(destinoSeguro(formData.get("de")));
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
