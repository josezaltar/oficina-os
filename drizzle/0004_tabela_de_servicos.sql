ALTER TABLE "catalogo_servicos" ADD COLUMN "referencia" text;--> statement-breakpoint
ALTER TABLE "catalogo_servicos" ADD COLUMN "preco_centavos" integer;--> statement-breakpoint
ALTER TABLE "catalogo_servicos" ADD COLUMN "categoria" text;--> statement-breakpoint
ALTER TABLE "catalogo_servicos" ADD CONSTRAINT "catalogo_servicos_referencia_unique" UNIQUE("referencia");--> statement-breakpoint
-- Escrito à mão: serviços que já foram usados em OS recebem como preço o
-- último valor cobrado.
UPDATE "catalogo_servicos" AS c SET "preco_centavos" = ultimo."valor"
FROM (
  SELECT DISTINCT ON (lower(i."descricao")) lower(i."descricao") AS "chave", i."valor_unitario_centavos" AS "valor"
  FROM "itens_os" AS i
  ORDER BY lower(i."descricao"), i."id" DESC
) AS ultimo
WHERE lower(c."descricao") = ultimo."chave" AND c."preco_centavos" IS NULL;
