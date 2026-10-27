// Configuração do drizzle-kit, a ferramenta de linha de comando que gera e
// aplica as migrations. Ela lê o .env sozinha (os scripts usam --env-file).
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle", // onde ficam os arquivos .sql das migrations
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
