import type { Metadata } from "next";
import { FormCliente } from "@/components/form-cliente";
import { Cabecalho, Cartao } from "@/components/ui";
import { criarCliente } from "../acoes";

export const metadata: Metadata = { title: "Novo cliente" };

// Server Component simples: entrega a Server Action para o formulário (client).
export default function NovoClientePage() {
  return (
    <div>
      <Cabecalho titulo="Novo cliente" />
      <Cartao>
        <FormCliente acao={criarCliente} voltarPara="/clientes" />
      </Cartao>
    </div>
  );
}
