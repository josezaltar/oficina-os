CREATE TABLE "contas_pagar" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contas_pagar_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"descricao" text NOT NULL,
	"fornecedor" text,
	"categoria" text,
	"valor_centavos" integer NOT NULL,
	"vencimento" date NOT NULL,
	"paga_em" date,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "pagamento_vencimento" date;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "paga_em" date;