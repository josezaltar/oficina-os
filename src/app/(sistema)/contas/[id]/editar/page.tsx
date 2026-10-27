import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotaoEnviar } from "@/components/botao-enviar";
import { BotaoExcluir } from "@/components/botao-excluir";
import { FormConta } from "@/components/form-conta";
import { Cabecalho, Cartao } from "@/components/ui";
import { buscarConta, sugestoesDeContas } from "@/lib/dados/contas";
import { lerId } from "@/lib/dados/id";
import { dataBr } from "@/lib/financeiro";
import { centavosParaCampo } from "@/lib/formato";
import { atualizarConta, desfazerPagamentoConta, excluirConta } from "../../acoes";

export const metadata: Metadata = { title: "Editar conta" };

export default async function EditarContaPage({ params }: PageProps<"/contas/[id]/editar">) {
  const id = lerId((await params).id);
  const [conta, sugestoes] = await Promise.all([buscarConta(id), sugestoesDeContas()]);
  if (!conta) notFound();

  return (
    <div>
      <Cabecalho titulo="Editar conta" descricao={conta.descricao}>
        {conta.pagaEm && (
          <form action={desfazerPagamentoConta.bind(null, id)}>
            <BotaoEnviar variante="secundario" enviando="...">
              Desfazer pagamento
            </BotaoEnviar>
          </form>
        )}
        <BotaoExcluir acao={excluirConta.bind(null, id)} />
      </Cabecalho>
      {conta.pagaEm && (
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">Conta paga em {dataBr(conta.pagaEm)}.</p>
      )}
      <Cartao>
        <FormConta
          acao={atualizarConta.bind(null, id)}
          sugestoes={sugestoes}
          editando
          inicial={{
            descricao: conta.descricao,
            fornecedor: conta.fornecedor ?? "",
            categoria: conta.categoria ?? "",
            valor: centavosParaCampo(conta.valorCentavos),
            vencimento: conta.vencimento,
            pagaEm: conta.pagaEm ?? "",
            observacoes: conta.observacoes ?? "",
          }}
        />
      </Cartao>
    </div>
  );
}
