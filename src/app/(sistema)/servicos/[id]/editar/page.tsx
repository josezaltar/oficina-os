import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { FormServico } from "@/components/form-servico";
import { Cabecalho, Cartao } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { lerId } from "@/lib/dados/id";
import { buscarServico, categoriasDeServico } from "@/lib/dados/servicos";
import { centavosParaCampo } from "@/lib/formato";
import { atualizarServico, excluirServico } from "../../acoes";

export const metadata: Metadata = { title: "Editar serviço" };

export default async function EditarServicoPage({ params }: PageProps<"/servicos/[id]/editar">) {
  const id = lerId((await params).id);
  const [servico, categorias, usuario] = await Promise.all([
    buscarServico(id),
    categoriasDeServico(),
    exigirUsuario(),
  ]);
  if (!servico) notFound();

  return (
    <div>
      <Cabecalho titulo="Editar serviço" descricao={servico.referencia ? `Código ${servico.referencia}` : undefined}>
        {usuario.papel === "gerente" && <BotaoExcluir acao={excluirServico.bind(null, id)} />}
      </Cabecalho>
      <Cartao>
        <FormServico
          acao={atualizarServico.bind(null, id)}
          categorias={categorias}
          inicial={{
            referencia: servico.referencia ?? "",
            descricao: servico.descricao,
            preco: servico.precoCentavos != null ? centavosParaCampo(servico.precoCentavos) : "",
            categoria: servico.categoria ?? "",
          }}
        />
        <p className="mt-4 text-xs text-slate-500">
          Mudar o preço ou a descrição aqui não altera as OS já lançadas.
        </p>
      </Cartao>
    </div>
  );
}
