ALTER TABLE "ordens_servico" ALTER COLUMN "descricao_problema" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "cidade" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "cep" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "numero" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "cliente_nome" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "cliente_telefone" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "cliente_cidade" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "cliente_cep" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "cliente_numero" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "veiculo_placa" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "veiculo_marca" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "veiculo_modelo" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "veiculo_tipo" text;--> statement-breakpoint
ALTER TABLE "veiculos" ADD COLUMN "tipo" text;--> statement-breakpoint
-- Escrito à mão: as OS que já existem recebem a cópia dos dados do cadastro.
UPDATE "ordens_servico" AS o SET
  "cliente_nome" = c."nome",
  "cliente_telefone" = c."telefone",
  "cliente_cidade" = c."cidade",
  "cliente_cep" = c."cep",
  "cliente_numero" = c."numero",
  "veiculo_placa" = v."placa",
  "veiculo_marca" = v."marca",
  "veiculo_modelo" = v."modelo",
  "veiculo_tipo" = v."tipo"
FROM "veiculos" AS v
JOIN "clientes" AS c ON c."id" = v."cliente_id"
WHERE v."id" = o."veiculo_id" AND o."cliente_nome" IS NULL;
