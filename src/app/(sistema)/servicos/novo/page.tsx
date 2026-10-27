import type { Metadata } from "next";
import { FormServico } from "@/components/form-servico";
import { Cabecalho, Cartao } from "@/components/ui";
import { categoriasDeServico, proximaReferencia } from "@/lib/dados/servicos";
import { criarServico } from "../acoes";

export const metadata: Metadata = { title: "Novo serviço" };

export default async function NovoServicoPage() {
  // O código já vem sugerido: o próximo número livre da tabela
  const [categorias, referencia] = await Promise.all([categoriasDeServico(), proximaReferencia()]);

  return (
    <div>
      <Cabecalho titulo="Novo serviço" />
      <Cartao>
        <FormServico acao={criarServico} categorias={categorias} inicial={{ referencia }} />
      </Cartao>
    </div>
  );
}
