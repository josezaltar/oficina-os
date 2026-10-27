/*
  Conexão com o banco.

  `server-only` faz o build FALHAR se algum Client Component importar este
  arquivo por engano. Assim a URL do banco nunca vai parar no navegador.
*/
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/*
  Em desenvolvimento, o Next recarrega os módulos a cada alteração. Sem este
  cuidado, cada recarga abriria uma conexão nova até estourar o limite do
  banco. Guardamos o cliente em `globalThis`, que sobrevive às recargas.
*/
const globalParaDb = globalThis as unknown as {
  conexao?: ReturnType<typeof postgres>;
};

// postgres.js só conecta de fato na primeira consulta, então o build não
// precisa do banco.
const conexao =
  globalParaDb.conexao ??
  postgres(process.env.DATABASE_URL ?? "", {
    // Na Vercel, cada função serverless abre poucas conexões.
    max: process.env.NODE_ENV === "production" ? 5 : 10,
  });

if (process.env.NODE_ENV !== "production") globalParaDb.conexao = conexao;

export const db = drizzle(conexao, { schema });
