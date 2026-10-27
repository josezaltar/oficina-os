/*
  Link mágico da demonstração (etapa 10): abrir /demo já entra no sistema
  com a conta de gerente fictícia. É o link que vai no README, no currículo
  e no LinkedIn: o recrutador clica uma vez e está dentro.

  `route.ts` é um Route Handler: em vez de uma página, responde direto a
  uma requisição HTTP (aqui, um GET).

  Só funciona com DEMO_MODE=true. No deploy da oficina (dados reais), esta
  rota manda para o login normal.
*/
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { criarSessao } from "@/lib/auth";

export async function GET() {
  await connection(); // sempre na hora do acesso, nunca pré-renderizado

  if (process.env.DEMO_MODE !== "true") redirect("/login");

  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, "gerente@oficina.dev"),
  });
  if (!usuario) redirect("/login");

  await criarSessao({ usuarioId: usuario.id, papel: usuario.papel });
  redirect("/");
}
