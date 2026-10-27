import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { ControleStatus } from "@/components/controle-status";
import { EditorItens } from "@/components/editor-itens";
import { Cabecalho, Cartao, EtiquetaStatus, Tabela, classeBotao } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { lerId } from "@/lib/dados/id";
import { buscarOrdem, cabecalhoDaOrdem } from "@/lib/dados/ordens";
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
  const bloco = cabecalhoDaOrdem(ordem);
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

      {/* Cabeçalho do bloco: os dados como foram escritos NESTA OS */}
      <Cartao
        titulo={
          <span className="flex flex-wrap items-center justify-between gap-2">
            Dados da OS
            <span className="text-sm font-normal">
              <Link href={`/clientes/${veiculo.cliente.id}`} className="text-amber-700 hover:underline">
                Cadastro do cliente
              </Link>
              {" · "}
              <Link href={`/veiculos/${veiculo.id}`} className="text-amber-700 hover:underline">
                Histórico do veículo
              </Link>
            </span>
          </span>
        }
      >
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <Info rotulo="Placa" valor={formatarPlaca(bloco.placa)} mono />
          <Info rotulo="Nome" valor={bloco.nome} />
          <Info rotulo="Tel" valor={bloco.telefone} />
          <Info rotulo="Cidade" valor={bloco.cidade} />
          <Info rotulo="CEP" valor={bloco.cep} />
          <Info rotulo="Nº" valor={bloco.numero} />
          <Info rotulo="Marca" valor={bloco.marca} />
          <Info rotulo="Modelo" valor={bloco.modelo} />
          <Info rotulo="Tipo" valor={bloco.tipo} />
        </dl>
        {/* OS antigas, de antes do formato do bloco, podem ter esses campos */}
        {(ordem.descricaoProblema || ordem.kmEntrada || ordem.observacoes) && (
          <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
            {ordem.descricaoProblema && <p>Problema: {ordem.descricaoProblema}</p>}
            {ordem.kmEntrada && <p>Km na entrada: {formatarNumero(ordem.kmEntrada)}</p>}
            {ordem.observacoes && <p>Obs.: {ordem.observacoes}</p>}
          </div>
        )}
      </Cartao>

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
            <th>Unid.</th>
            <th>Descrição</th>
            <th className="text-right">Preço Unit.</th>
            <th className="text-right">Total</th>
            <th className="text-xs font-medium text-slate-500">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>{formatarNumero(item.quantidade)}</td>
              <td>{item.descricao}</td>
              <td className="text-right whitespace-nowrap">
                {formatarMoeda(item.valorUnitarioCentavos)}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatarMoeda(subtotalCentavos(item))}
              </td>
              <td className="text-xs text-slate-500">{item.tipo === "peca" ? "Peça" : "Serviço"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={3} className="text-right">
              TOTAL
            </td>
            <td className="text-right whitespace-nowrap" data-testid="total-os">
              {formatarMoeda(totalCentavos)}
            </td>
            <td />
          </tr>
        </tfoot>
      </Tabela>
    </div>
  );
}

function Info({ rotulo, valor, mono = false }: { rotulo: string; valor: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{rotulo}</dt>
      <dd className={`mt-0.5 font-medium ${mono ? "font-mono" : ""}`}>{valor || "—"}</dd>
    </div>
  );
}
