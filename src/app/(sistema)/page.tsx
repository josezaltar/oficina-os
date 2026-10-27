import Link from "next/link";
import { Suspense } from "react";
import { Cabecalho, Cartao, EtiquetaStatus, classeBotao } from "@/components/ui";
import { obterUsuario } from "@/lib/auth";
import {
  contarPorStatus,
  faturamentoDoMes,
  filaDeTrabalho,
  servicosMaisFeitos,
} from "@/lib/dados/painel";
import { formatarMoeda, formatarPlaca } from "@/lib/formato";
import { FLUXO_STATUS, ROTULO_STATUS } from "@/lib/regras-os";

/*
  Painel (etapa 8) com STREAMING.

  A página em si não espera nada: o título e os cartões vazios aparecem
  na hora. Cada cartão é um componente assíncrono dentro do seu próprio
  <Suspense>, e vai "chegando" quando a consulta dele termina.
  Se o faturamento demorar, as contagens não ficam esperando por ele.

  Compare com o loading.tsx, que troca a página INTEIRA por um "carregando".
*/
export default function PainelPage() {
  return (
    <div className="space-y-6">
      <Cabecalho titulo="Painel" descricao="Oficina Catalão Diesel · visão geral do mês">
        <Link href="/ordens/nova" className={classeBotao.primario}>
          Nova OS
        </Link>
      </Cabecalho>

      <Suspense fallback={<FallbackCartoes quantidade={4} />}>
        <ContagemPorStatus />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<FallbackCartao />}>
          <Faturamento />
        </Suspense>
        <Suspense fallback={<FallbackCartao />}>
          <ServicosMaisFeitos />
        </Suspense>
      </div>

      <Suspense fallback={<FallbackCartao />}>
        <FilaDeTrabalho />
      </Suspense>
    </div>
  );
}

async function ContagemPorStatus() {
  const contagens = await contarPorStatus();
  const total = (s: string) => contagens.find((c) => c.status === s)?.total ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {FLUXO_STATUS.map((status) => (
        <Link
          key={status}
          href={`/ordens?status=${status}`}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-400"
        >
          <p className="text-sm text-slate-600">{ROTULO_STATUS[status]}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{total(status)}</p>
        </Link>
      ))}
    </div>
  );
}

async function Faturamento() {
  // Faturamento é informação de gerente (etapa 7: papéis)
  const usuario = await obterUsuario();
  if (usuario?.papel !== "gerente") {
    return (
      <Cartao titulo="Faturamento do mês">
        <p className="text-sm text-slate-600">Disponível apenas para gerentes.</p>
      </Cartao>
    );
  }

  const { totalCentavos, quantidade, inicio } = await faturamentoDoMes();
  // "outubro de 2026" → "Outubro de 2026"
  const mesMinusculo = inicio.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const mes = mesMinusculo.charAt(0).toUpperCase() + mesMinusculo.slice(1);
  const ticketMedio = quantidade > 0 ? Math.round(totalCentavos / quantidade) : 0;

  return (
    <Cartao titulo={`Faturamento · ${mes}`}>
      <p className="text-4xl font-bold tabular-nums" data-testid="faturamento">
        {formatarMoeda(totalCentavos)}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        {quantidade} {quantidade === 1 ? "OS entregue" : "OS entregues"} · ticket médio{" "}
        {formatarMoeda(ticketMedio)}
      </p>
    </Cartao>
  );
}

async function ServicosMaisFeitos() {
  const servicos = await servicosMaisFeitos();
  const maior = Math.max(1, ...servicos.map((s) => s.vezes));

  return (
    <Cartao titulo="Serviços mais feitos no mês">
      {servicos.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhum serviço lançado este mês.</p>
      ) : (
        <ol className="space-y-3">
          {servicos.map((s) => (
            <li key={s.descricao} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{s.descricao}</span>
                <span className="whitespace-nowrap text-slate-600 tabular-nums">
                  {s.vezes}× · {formatarMoeda(s.totalCentavos)}
                </span>
              </div>
              {/* Barrinha proporcional, feita só com CSS (largura em %) */}
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-amber-500"
                  style={{ width: `${(s.vezes / maior) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Cartao>
  );
}

async function FilaDeTrabalho() {
  const fila = await filaDeTrabalho();
  return (
    <Cartao titulo="Na oficina agora (mais antigas primeiro)">
      {fila.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhum veículo na oficina. 🎉</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {fila.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <Link href={`/ordens/${o.id}`} className="hover:underline">
                <span className="font-semibold">OS {o.id}</span> ·{" "}
                <span className="font-mono">{formatarPlaca(o.placa)}</span> · {o.veiculo}
                <span className="block text-xs text-slate-500">{o.clienteNome}</span>
              </Link>
              <span className="flex items-center gap-3">
                <span className={o.dias >= 7 ? "font-semibold text-red-600" : "text-slate-600"}>
                  {o.dias === 0 ? "hoje" : `${o.dias} ${o.dias === 1 ? "dia" : "dias"}`}
                </span>
                <EtiquetaStatus status={o.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

function FallbackCartao() {
  return <div className="h-48 animate-pulse rounded-lg bg-slate-200" aria-label="Carregando" />;
}

function FallbackCartoes({ quantidade }: { quantidade: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  );
}
