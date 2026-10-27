import Link from "next/link";
import { connection } from "next/server";
import { alertasDeVencimento } from "@/lib/dados/contas";
import { DIAS_DE_AVISO } from "@/lib/financeiro";
import { formatarMoeda, hojeEmSaoPaulo } from "@/lib/formato";

/*
  Alerta no topo de TODAS as páginas (só para o gerente):
  - contas a pagar vencidas ou que vencem em até 2 dias;
  - OS que o cliente ainda não pagou, com vencimento nesse mesmo prazo.
  Quando a conta é paga, ela sai daqui sozinha (o alerta só conta as pendentes).

  Fica no layout dentro de um <Suspense>: lê o login e a data de hoje,
  então espera a hora do acesso sem atrasar o resto da página.
*/
export async function AlertaVencimentos() {
  await connection();
  const alertas = await alertasDeVencimento(hojeEmSaoPaulo());
  if (!alertas) return null; // atendente: sem alerta

  const { contas, receber } = alertas;
  const temContas = contas.vencidas > 0 || contas.proximas > 0;
  const temReceber = receber.quantidade > 0;
  if (!temContas && !temReceber) return null;

  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

  return (
    <div role="alert" className="mb-6 space-y-2 print:hidden">
      {contas.vencidas > 0 && (
        <Faixa cor="vermelha" href="/contas">
          <strong>{plural(contas.vencidas, "conta vencida", "contas vencidas")}</strong> ·{" "}
          {formatarMoeda(contas.valorVencidas)}
        </Faixa>
      )}
      {contas.proximas > 0 && (
        <Faixa cor="amarela" href="/contas">
          <strong>
            {plural(contas.proximas, "conta vence", "contas vencem")} em até {DIAS_DE_AVISO} dias
          </strong>{" "}
          · {formatarMoeda(contas.valorProximas)}
        </Faixa>
      )}
      {temReceber && (
        <Faixa cor="azul" href="/ordens?pagamento=a_receber">
          <strong>{plural(receber.quantidade, "OS a receber", "OS a receber")}</strong> vencendo ou vencidas ·{" "}
          {formatarMoeda(receber.valor)}
        </Faixa>
      )}
    </div>
  );
}

const cores = {
  vermelha: "border-red-300 bg-red-50 text-red-800",
  amarela: "border-amber-300 bg-amber-50 text-amber-900",
  azul: "border-sky-300 bg-sky-50 text-sky-900",
};

function Faixa({ cor, href, children }: { cor: keyof typeof cores; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm hover:brightness-95 ${cores[cor]}`}
    >
      <span>⚠ {children}</span>
      <span className="shrink-0 font-semibold underline">Ver</span>
    </Link>
  );
}
