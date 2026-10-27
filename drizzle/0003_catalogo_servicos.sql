CREATE TABLE "catalogo_servicos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catalogo_servicos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"descricao" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "catalogo_servicos_unico" ON "catalogo_servicos" USING btree (lower("descricao"));--> statement-breakpoint
-- Escrito à mão: as descrições já usadas nas OS entram no catálogo (sem repetir).
INSERT INTO "catalogo_servicos" ("descricao")
SELECT DISTINCT ON (lower(trim("descricao"))) trim("descricao")
FROM "itens_os"
ORDER BY lower(trim("descricao")), "id"
ON CONFLICT DO NOTHING;
