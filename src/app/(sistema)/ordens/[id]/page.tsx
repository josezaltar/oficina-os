import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { ControleStatus } from "@/components/controle-status";
import { EditorItens } from "@/components/editor-itens";
import { Cabecalho, Cartao, EtiquetaStatus, Tabela, classeBotao } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { lerId } from "@/lib/dados/id";
import { buscarOrdem } from "@/lib/dados/ordens";
import {
  formatarDataHora,
  formatarMoeda,
  formatarNumero,
  formatarPlaca,
} from "@/lib/formato";
import { podeEditarItens, podeExcluirOs, subtotalCentavos } from "@/lib/regras-os";
import { excluirOrdem, mudarStatus, salvarItens } from "../acoes";

export const metadata: Metadata = { title: "Ordem de serviço" };

/*
  Página da OS: Server Component que busca tudo no banco e "encaixa"
  pedaços interativos (Client Components): EditorItens e ControleStatus.
  Cada um recebe uma Server Action com o id da OS já amarrado (.bind).
*/
export default async function OrdemPage({ params }: PageProps<"/ordens/[id]">) {
  const id = lerId((await params).id);
  const ordem = await buscarOrdem(id);
  if (!ordem) notFound();
  const usuario = await exigirUsuario();

  const { veiculo } = ordem;
  const editavel = podeEditarItens(ordem.status);

  return (
    <div className="space-y-6">
      <Cabecalho
        titulo={`OS nº ${ordem.id}`}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <EtiquetaStatus status={ordem.status} />
            Aberta em {formatarDataHora(ordem.abertaEm)}
            {ordem.criadoPor && ` por ${ordem.criadoPor.nome}`}
          </span>
        }
      >
        <Link href={`/imprimir/os/${id}`} className={classeBotao.secundario}>
          Imprimir
        </Link>
        {usuario.papel === "gerente" && podeExcluirOs(ordem.status) && (
          <BotaoExcluir acao={excluirOrdem.bind(null, id)} rotulo="Excluir OS" />
        )}
      </Cabecalho>

      <div className="grid gap-6 lg:grid-cols-3">
        <Cartao titulo="Veículo e cliente">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Veículo</dt>
              <dd className="font-medium">
                <Link href={`/veiculos/${veiculo.id}`} className="hover:underline">
                  <span className="font-mono">{formatarPlaca(veiculo.placa)}</span> ·{" "}
                  {veiculo.marca} {veiculo.modelo}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Cliente</dt>
              <dd className="font-medium">
                <Link href={`/clientes/${veiculo.cliente.id}`} className="hover:underline">
                  {veiculo.cliente.nome}
                </Link>
                <span className="block font-normal text-slate-600">
                  {veiculo.cliente.telefone}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Km na entrada</dt>
              <dd className="font-medium">
                {ordem.kmEntrada ? formatarNumero(ordem.kmEntrada) : "—"}
              </dd>
            </div>
          </dl>
        </Cartao>

        <Cartao titulo="Problema relatado" className="lg:col-span-2">
          <p className="text-sm whitespace-pre-line">{ordem.descricaoProblema}</p>
          {ordem.observacoes && (
            <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm whitespace-pre-line text-amber-900">
              <strong>Obs. interna:</strong> {ordem.observacoes}
            </p>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Status">
        <ControleStatus status={ordem.status} acao={mudarStatus.bind(null, id)} />
      </Cartao>

      <Cartao titulo="Peças e serviços">
        {editavel ? (
          <EditorItens acao={salvarItens.bind(null, id)} itens={ordem.itens} />
        ) : (
          <ItensSomenteLeitura itens={ordem.itens} totalCentavos={ordem.totalCentavos} />
        )}
      </Cartao>
    </div>
  );
}

/** Depois de "Pronta", os itens viram só leitura (regra podeEditarItens). */
function ItensSomenteLeitura({
  itens,
  totalCentavos,
}: {
  itens: { id: number; tipo: string; descricao: string; quantidade: number; valorUnitarioCentavos: number }[];
  totalCentavos: number;
}) {
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        A OS está finalizada para edição. Para alterar os itens, volte o status para
        &quot;Em andamento&quot;.
      </p>
      <Tabela>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descrição</th>
            <th className="text-right">Qtd.</th>
            <th className="text-right">Valor unit.</th>
            <th className="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>{item.tipo === "peca" ? "Peça" : "Serviço"}</td>
              <td>{item.descricao}</td>
              <td className="text-right">{formatarNumero(item.quantidade)}</td>
              <td className="text-right whitespace-nowrap">
                {formatarMoeda(item.valorUnitarioCentavos)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatarMoeda(subtotalCentavos(item))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={4} className="text-right">
              Total
            </td>
            <td className="text-right whitespace-nowrap" data-testid="total-os">
              {formatarMoeda(totalCentavos)}
            </td>
          </tr>
        </tfoot>
      </Tabela>
    </div>
  );
}
