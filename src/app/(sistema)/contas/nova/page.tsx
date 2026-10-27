import type { Metadata } from "next";
import { FormConta } from "@/components/form-conta";
import { Cabecalho, Cartao } from "@/components/ui";
import { sugestoesDeContas } from "@/lib/dados/contas";
import { criarConta } from "../acoes";

export const metadata: Metadata = { title: "Nova conta" };

export default async function NovaContaPage() {
  // sugestoesDeContas() já barra quem não é gerente (exigirFinanceiro)
  const sugestoes = await sugestoesDeContas();
  return (
    <div>
      <Cabecalho titulo="Nova conta a pagar" />
      <Cartao>
        <FormConta acao={criarConta} sugestoes={sugestoes} />
      </Cartao>
    </div>
  );
}
