import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { Cabecalho, Cartao, EstadoVazio, Tabela, classeBotao } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { primeiroValor } from "@/lib/dados/busca";
import { relatorioDoMes } from "@/lib/dados/relatorio";
import { EMPRESA } from "@/lib/empresa";
import { dataBr, somarMeses } from "@/lib/financeiro";
import { formatarMoeda, formatarPlaca, hojeEmSaoPaulo } from "@/lib/formato";

export const metadata: Metadata = { title: "Relatório" };

/*
  Relatório financeiro do mês (só gerente): /relatorio?mes=2026-10
  Entradas (OS entregues e pagas) − saídas (contas pagas) = saldo do mês.
  Dá para imprimir: o menu e os botões somem no papel (print:hidden).
*/
export default async function RelatorioPage({ searchParams }: PageProps<"/relatorio">) {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "gerente") {
    return (
      <Cartao titulo="Acesso restrito">
        <p className="text-sm text-slate-600">Apenas gerentes podem ver o relatório financeiro.</p>
      </Cartao>
    );
  }

  await connection();
  const mesAtual = hojeEmSaoPaulo().slice(0, 7);
  const pedido = primeiroValor((await searchParams).mes);
  const mes = pedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? pedido : mesAtual;
  const r = await relatorioDoMes(mes);

  const nomeDoMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const titulo = nomeDoMes.charAt(0).toUpperCase() + nomeDoMes.slice(1);

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Relatório financeiro" descricao={`${EMPRESA.nome} · ${titulo}`}>
        <BotaoImprimir />
      </Cabecalho>

      {/* Navegação entre meses (some na impressão) */}
      <nav aria-label="Escolher mês" className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/relatorio?mes=${somarMeses(mes, -1)}`} className={classeBotao.secundario}>
          ← Mês anterior
        </Link>
        <span className="px-2 text-lg font-semibold">{titulo}</span>
        {mes < mesAtual && (
          <Link href={`/relatorio?mes=${somarMeses(mes, 1)}`} className={classeBotao.secundario}>
            Próximo mês →
          </Link>
        )}
        {mes !== mesAtual && (
          <Link href="/relatorio" className="text-sm text-slate-600 underline">
            Mês atual
          </Link>
        )}
      </nav>

      {/* ------------------------------------------ resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Numero titulo="Entradas" valor={r.entradas} cor="verde">
          {r.recebidas.length} OS entregues e pagas
        </Numero>
        <Numero titulo="Saídas" valor={r.saidas} cor="vermelho">
          {r.contasPagas.length} {r.contasPagas.length === 1 ? "conta paga" : "contas pagas"}
        </Numero>
        <Numero titulo="Saldo do mês" valor={r.saldo} cor={r.saldo >= 0 ? "verde" : "vermelho"} destaque>
          Entradas − saídas
        </Numero>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Pendente titulo="A receber (OS entregues sem pagamento)" valor={r.aReceber.total} href="/ordens?pagamento=a_receber">
          {r.aReceber.quantidade} OS
        </Pendente>
        <Pendente titulo="A pagar (contas pendentes)" valor={r.aPagar.total} href="/contas">
          {r.aPagar.quantidade} {r.aPagar.quantidade === 1 ? "conta" : "contas"}
        </Pendente>
      </div>

      {/* ------------------------------------------ detalhes */}
      <Cartao titulo="Entradas · OS entregues e pagas no mês">
        {r.recebidas.length === 0 ? (
          <EstadoVazio>Nenhuma OS entregue e paga neste mês.</EstadoVazio>
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th>Pago em</th>
                <th>OS</th>
                <th>Cliente</th>
                <th className="hidden sm:table-cell">Placa</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {r.recebidas.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap tabular-nums">{dataBr(o.pagaEm!)}</td>
                  <td>
                    <Link href={`/ordens/${o.id}`} className="font-medium hover:underline">
                      {o.id}
                    </Link>
                  </td>
                  <td>{o.clienteNome}</td>
                  <td className="hidden font-mono sm:table-cell">{formatarPlaca(o.placa)}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">{formatarMoeda(o.totalCentavos)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={4} className="text-right">
                  Total de entradas
                </td>
                <td className="text-right whitespace-nowrap tabular-nums">{formatarMoeda(r.entradas)}</td>
              </tr>
            </tfoot>
          </Tabela>
        )}
      </Cartao>

      <Cartao titulo="Saídas · contas pagas no mês">
        {r.contasPagas.length === 0 ? (
          <EstadoVazio>Nenhuma conta paga neste mês.</EstadoVazio>
        ) : (
          <div className="space-y-4">
            {/* Por categoria: para onde foi o dinheiro */}
            <ul className="flex flex-wrap gap-2 text-sm">
              {r.porCategoria.map((c) => (
                <li key={c.categoria} className="rounded-full bg-slate-100 px-3 py-1">
                  {c.categoria}: <strong className="tabular-nums">{formatarMoeda(c.total)}</strong>
                </li>
              ))}
            </ul>
            <Tabela>
              <thead>
                <tr>
                  <th>Pago em</th>
                  <th>Descrição</th>
                  <th className="hidden sm:table-cell">Fornecedor</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {r.contasPagas.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap tabular-nums">{dataBr(c.pagaEm!)}</td>
                    <td>
                      {c.descricao}
                      {c.categoria && <span className="block text-xs text-slate-500">{c.categoria}</span>}
                    </td>
                    <td className="hidden sm:table-cell">{c.fornecedor ?? "—"}</td>
                    <td className="text-right whitespace-nowrap tabular-nums">{formatarMoeda(c.valorCentavos)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={3} className="text-right">
                    Total de saídas
                  </td>
                  <td className="text-right whitespace-nowrap tabular-nums">{formatarMoeda(r.saidas)}</td>
                </tr>
              </tfoot>
            </Tabela>
          </div>
        )}
      </Cartao>

      <p className="text-xs text-slate-500">
        Conta pela data do pagamento ({dataBr(r.de)} a {dataBr(r.ate)}). Entradas: OS com status
        &quot;Entregue&quot; e pagamento registrado. Saídas: contas a pagar marcadas como pagas.
      </p>
    </div>
  );
}

const coresNumero = { verde: "text-green-700", vermelho: "text-red-700" };

function Numero({
  titulo,
  valor,
  cor,
  destaque = false,
  children,
}: {
  titulo: string;
  valor: number;
  cor: keyof typeof coresNumero;
  destaque?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${destaque ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}
    >
      <p className={`text-sm ${destaque ? "text-slate-300" : "text-slate-600"}`}>{titulo}</p>
      <p
        className={`mt-1 text-3xl font-bold tabular-nums ${destaque ? (valor >= 0 ? "text-green-400" : "text-red-400") : coresNumero[cor]}`}
        data-testid={`relatorio-${titulo}`}
      >
        {formatarMoeda(valor)}
      </p>
      <p className={`mt-1 text-xs ${destaque ? "text-slate-400" : "text-slate-500"}`}>{children}</p>
    </div>
  );
}

function Pendente({ titulo, valor, href, children }: { titulo: string; valor: number; href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg border border-dashed border-slate-300 bg-white p-4 hover:border-amber-400">
      <p className="text-sm text-slate-600">{titulo}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{formatarMoeda(valor)}</p>
      <p className="mt-1 text-xs text-slate-500">{children} · não entra no saldo</p>
    </Link>
  );
}
