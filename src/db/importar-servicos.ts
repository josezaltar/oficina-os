/*
  Importa a tabela de serviços (CSV) para a área Serviços.

  Uso:  npm run db:importar-servicos
        npm run db:importar-servicos -- caminho/do/arquivo.csv

  Arquivo padrão: dados-privados/tabela-servicos.csv (fica FORA do Git, ver
  .gitignore: o repositório é público e a tabela de preços é da oficina).

  Formato (separado por ponto e vírgula, primeira linha = cabeçalho):
    referencia;descricao;preco;categoria
    00145;TROCAR OLEO E FILTRO DO MOTOR;150,00;MOTOR

  Pode rodar quantas vezes quiser:
  - serviço com o mesmo CÓDIGO → atualiza descrição, preço e categoria;
  - mesma DESCRIÇÃO sem código (ex.: veio de uma OS) → ganha código e preço;
  - senão → é cadastrado.
  Se duas linhas tiverem a mesma descrição, a segunda entra com o código no
  fim ("... (00013)"), para não repetir. Renomeie depois na área Serviços.
*/
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { lerMoedaEmCentavos } from "../lib/formato";
import { catalogoServicos } from "./schema";

type Linha = { referencia: string; descricao: string; precoCentavos: number | null; categoria: string | null };

function lerCsv(caminho: string): Linha[] {
  const texto = readFileSync(caminho, "utf-8").replace(/^﻿/, ""); // tira o BOM do Excel
  const [cabecalho, ...linhas] = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!cabecalho.toLowerCase().startsWith("referencia;descricao;preco")) {
    throw new Error("Cabeçalho inesperado. Esperado: referencia;descricao;preco;categoria");
  }
  return linhas.map((linha, i) => {
    const [referencia = "", descricao = "", preco = "", categoria = ""] = linha.split(";");
    const precoCentavos = preco.trim() ? lerMoedaEmCentavos(preco) : null;
    if (!descricao.trim() || Number.isNaN(precoCentavos)) {
      throw new Error(`Linha ${i + 2} inválida: ${linha}`);
    }
    return {
      referencia: referencia.trim(),
      descricao: descricao.trim().replace(/\s+/g, " "),
      precoCentavos,
      categoria: categoria.trim().toUpperCase() || null,
    };
  });
}

async function main() {
  const caminho = process.argv[2] ?? "dados-privados/tabela-servicos.csv";
  const linhas = lerCsv(caminho);

  const conexao = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(conexao);
  console.log(`Banco: ${new URL(process.env.DATABASE_URL!).host}`);
  console.log(`Arquivo: ${caminho} (${linhas.length} serviços)`);

  // Descrições repetidas dentro do próprio arquivo ganham o código no fim
  const vistas = new Set<string>();
  const renomeadas: string[] = [];
  for (const l of linhas) {
    const chave = l.descricao.toLowerCase();
    if (vistas.has(chave)) {
      l.descricao = `${l.descricao} (${l.referencia})`;
      renomeadas.push(l.descricao);
    }
    vistas.add(l.descricao.toLowerCase());
  }

  let novos = 0;
  let atualizados = 0;
  // Transação: ou importa tudo, ou nada
  await db.transaction(async (tx) => {
    for (const l of linhas) {
      const dados = {
        referencia: l.referencia || null,
        descricao: l.descricao,
        precoCentavos: l.precoCentavos,
        categoria: l.categoria,
      };
      const [porCodigo] = l.referencia
        ? await tx.select({ id: catalogoServicos.id }).from(catalogoServicos).where(eq(catalogoServicos.referencia, l.referencia))
        : [];
      const [porDescricao] = porCodigo
        ? []
        : await tx
            .select({ id: catalogoServicos.id })
            .from(catalogoServicos)
            .where(sql`lower(${catalogoServicos.descricao}) = lower(${l.descricao})`);
      const existente = porCodigo ?? porDescricao;

      if (existente) {
        await tx.update(catalogoServicos).set(dados).where(eq(catalogoServicos.id, existente.id));
        atualizados++;
      } else {
        await tx.insert(catalogoServicos).values(dados);
        novos++;
      }
    }
  });

  console.log(`Pronto! ${novos} cadastrados, ${atualizados} atualizados.`);
  if (renomeadas.length) {
    console.log("Descrições repetidas no arquivo (renomeie na área Serviços):");
    for (const r of renomeadas) console.log(`  - ${r}`);
  }
  await conexao.end();
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
