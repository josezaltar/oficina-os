CREATE TABLE "catalogo_veiculos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catalogo_veiculos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"marca" text NOT NULL,
	"modelo" text NOT NULL,
	"ano" integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX "catalogo_veiculos_unico" ON "catalogo_veiculos" USING btree (lower("marca"),lower("modelo"),coalesce("ano", 0));--> statement-breakpoint
-- Escrito à mão: preenche o catálogo com os veículos que já existem no banco.
-- DISTINCT ON + ON CONFLICT DO NOTHING: cada combinação entra uma vez só.
INSERT INTO "catalogo_veiculos" ("marca", "modelo", "ano")
SELECT DISTINCT ON (lower("marca"), lower("modelo"), coalesce("ano", 0)) "marca", "modelo", "ano"
FROM "veiculos"
ORDER BY lower("marca"), lower("modelo"), coalesce("ano", 0), "id"
ON CONFLICT DO NOTHING;
