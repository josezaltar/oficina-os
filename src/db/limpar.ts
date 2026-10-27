/*
  Limpeza: apaga TODOS os clientes, veículos, ordens de serviço (com os
  itens) e o catálogo de marcas/modelos. Os USUÁRIOS são mantidos, para
  ninguém perder o login.

  Uso:  npm run db:limpar -- --sim

  ⚠️ Não tem volta. Use para começar o sistema do zero, antes de a oficina
  cadastrar os dados de verdade.
*/
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
  if (!process.argv.includes("--sim")) {
    console.log(
      "Este comando APAGA todos os clientes, veículos e ordens de serviço\n" +
        "(os usuários são mantidos). Não tem volta.\n" +
        "Para confirmar, rode: npm run db:limpar -- --sim",
    );
    process.exit(1);
  }

  const conexao = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(conexao);

  // Mostra de qual banco está apagando (sem a senha) para evitar engano
  const host = new URL(process.env.DATABASE_URL!).host;
  console.log(`Banco: ${host}`);

  // TRUNCATE apaga tudo de uma vez; RESTART IDENTITY faz a próxima OS,
  // o próximo cliente e o próximo veículo voltarem a ser o nº 1.
  await db.execute(
    sql`TRUNCATE itens_os, ordens_servico, veiculos, catalogo_veiculos, clientes RESTART IDENTITY`,
  );

  const [{ total }] = await db.execute<{ total: number }>(
    sql`SELECT count(*)::int AS total FROM usuarios`,
  );
  console.log(`Pronto! Clientes, veículos e ordens apagados. Usuários mantidos: ${total}.`);
  await conexao.end();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
