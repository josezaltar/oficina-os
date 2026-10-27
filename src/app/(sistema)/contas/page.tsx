import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BotaoEnviar } from "@/components/botao-enviar";
import { FormBusca } from "@/components/form-busca";
import { Cabecalho, Cartao, EstadoVazio, EtiquetaVencimento, Tabela, classeBotao } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { primeiroValor } from "@/lib/dados/busca";
import { listarContas, totaisDeContas, type AbaContas } from "@/lib/dados/contas";
import { dataBr } from "@/lib/financeiro";
import { formatarMoeda, hojeEmSaoPaulo } from "@/lib/formato";
import { pagarConta } from "./acoes";

export const metadata: Metadata = { title: "Contas a pagar" };

const ABAS: { valor: AbaContas; rotulo: string }[] = [
  { valor: "pendentes", rotulo: "A pagar" },
  { valor: "pagas", rotulo: "Pagas" },
  { valor: "todas", rotulo: "Todas" },
];

/*
  Contas a pagar da oficina (só gerente).
  Aba "A pagar" (padrão): só as pendentes, a que vence primeiro no topo.
  "Pagar" marca a conta como paga hoje: ela some daqui e do alerta.
*/
export default async function ContasPage({ searchParams }: PageProps<"/contas">) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "gerente") {
    return (
      <Cartao titulo="Acesso restrito">
        <p className="text-sm text-slate-600">Apenas gerentes podem ver as contas a pagar.</p>
      </Cartao>
    );
  }

  const parametros = await searchParams;
  const aba = ABAS.find((a) => a.valor === primeiroValor(parametros.aba))?.valor ?? "pendentes";
  const busca = primeiroValor(parametros.busca);

  await connection(); // "hoje" é calculado na hora do acesso
  const hoje = hojeEmSaoPaulo();
  const [lista, totais] = await Promise.all([listarContas({ aba, busca }), totaisDeContas(hoje)]);
  const totalDaLista = lista.reduce((soma, c) => soma + c.valorCentavos, 0);

  return (
    <div>
      <Cabecalho titulo="Contas a pagar" descricao="Notas de fornecedor, água, luz e outras despesas da oficina.">
        <Link href="/contas/nova" className={classeBotao.primario}>
          Nova conta
        </Link>
      </Cabecalho>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Resumo titulo="Total a pagar" valor={formatarMoeda(totais.pendente)}>
          {totais.quantidade} {totais.quantidade === 1 ? "conta pendente" : "contas pendentes"}
        </Resumo>
        <Resumo titulo="Vencido" valor={formatarMoeda(totais.vencido)} alerta={totais.vencido > 0}>
          {totais.vencido > 0 ? "Pague o quanto antes" : "Nenhuma conta vencida"}
        </Resumo>
      </div>

      <nav aria-label="Filtrar contas" className="mb-4 flex flex-wrap gap-2">
        {ABAS.map((a) => {
          const ativa = a.valor === aba;
          return (
            <Link
              key={a.valor}
              href={a.valor === "pendentes" ? "/contas" : `/contas?aba=${a.valor}`}
              aria-current={ativa ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                ativa ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </nav>

      <FormBusca action="/contas" valor={busca} placeholder="Descrição, fornecedor ou categoria" />

      {lista.length === 0 ? (
        <EstadoVazio acao={aba === "pendentes" && !busca ? { href: "/contas/nova", rotulo: "Cadastrar conta" } : undefined}>
          {aba === "pendentes" ? "Nenhuma conta a pagar. 🎉" : "Nenhuma conta encontrada."}
        </EstadoVazio>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th className="hidden md:table-cell">Fornecedor</th>
              <th className="text-right">Valor</th>
              <th>Situação</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap tabular-nums">{dataBr(c.vencimento)}</td>
                <td>
                  <Link href={`/contas/${c.id}/editar`} className="font-medium hover:underline">
                    {c.descricao}
                  </Link>
                  {c.categoria && <span className="block text-xs text-slate-500">{c.categoria}</span>}
                </td>
                <td className="hidden md:table-cell">{c.fornecedor ?? "—"}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{formatarMoeda(c.valorCentavos)}</td>
                <td>
                  <EtiquetaVencimento hoje={hoje} vencimento={c.vencimento} pagaEm={c.pagaEm} />
                </td>
                <td className="text-right">
                  {!c.pagaEm && (
                    // Form com Server Action direto: um clique e a conta é quitada
                    <form action={pagarConta.bind(null, c.id)}>
                      <BotaoEnviar variante="secundario" enviando="...">
                        Pagar
                      </BotaoEnviar>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={3} className="text-right">
                Total da lista
              </td>
              <td className="text-right whitespace-nowrap tabular-nums">{formatarMoeda(totalDaLista)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </Tabela>
      )}
    </div>
  );
}

function Resumo({
  titulo,
  valor,
  alerta = false,
  children,
}: {
  titulo: string;
  valor: string;
  alerta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${alerta ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className={`text-sm ${alerta ? "text-red-700" : "text-slate-600"}`}>{titulo}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${alerta ? "text-red-700" : ""}`}>{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{children}</p>
    </div>
  );
}
