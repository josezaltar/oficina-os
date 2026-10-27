CREATE TYPE "public"."papel" AS ENUM('gerente', 'atendente');--> statement-breakpoint
CREATE TYPE "public"."status_os" AS ENUM('aberta', 'em_andamento', 'pronta', 'entregue');--> statement-breakpoint
CREATE TYPE "public"."tipo_item" AS ENUM('peca', 'servico');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clientes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"documento" text,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_os" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "itens_os_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ordem_id" integer NOT NULL,
	"tipo" "tipo_item" NOT NULL,
	"descricao" text NOT NULL,
	"quantidade" numeric(10, 2) DEFAULT 1 NOT NULL,
	"valor_unitario_centavos" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ordens_servico" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ordens_servico_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"veiculo_id" integer NOT NULL,
	"criado_por_id" integer,
	"status" "status_os" DEFAULT 'aberta' NOT NULL,
	"descricao_problema" text NOT NULL,
	"km_entrada" integer,
	"observacoes" text,
	"total_centavos" integer DEFAULT 0 NOT NULL,
	"aberta_em" timestamp with time zone DEFAULT now() NOT NULL,
	"entregue_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usuarios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"papel" "papel" DEFAULT 'atendente' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "veiculos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "veiculos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cliente_id" integer NOT NULL,
	"placa" text NOT NULL,
	"marca" text NOT NULL,
	"modelo" text NOT NULL,
	"ano" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "veiculos_placa_unique" UNIQUE("placa")
);
--> statement-breakpoint
ALTER TABLE "itens_os" ADD CONSTRAINT "itens_os_ordem_id_ordens_servico_id_fk" FOREIGN KEY ("ordem_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;