/*
  Componentes visuais reutilizáveis.
  Nenhum deles usa hooks, então funcionam em Server E Client Components.
  Centralizar aqui evita repetir as mesmas classes do Tailwind em todo lugar.
*/
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { StatusOs } from "@/db/schema";
import { ROTULO_STATUS } from "@/lib/regras-os";

export const classeBotao = {
  primario:
    "inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-amber-400 disabled:opacity-60",
  secundario:
    "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60",
  perigo:
    "inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60",
};

const classeCampo =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none aria-invalid:border-red-500";

/** Título da página com espaço para botões à direita. */
export function Cabecalho({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-600">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Cartao({
  titulo,
  children,
  className = "",
}: {
  titulo?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {titulo && <h2 className="mb-4 text-base font-semibold">{titulo}</h2>}
      {children}
    </section>
  );
}

/** Mensagens de erro de um campo (vindas da validação no servidor). */
function ErrosCampo({ id, erros }: { id: string; erros?: string[] }) {
  if (!erros?.length) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-600">
      {erros.join(" ")}
    </p>
  );
}

type PropsCampo = {
  rotulo: string;
  name: string;
  erros?: string[];
  dica?: string;
};

/** <label> + <input> + erro, já ligados para acessibilidade. */
export function Campo({
  rotulo,
  name,
  erros,
  dica,
  ...props
}: PropsCampo & ComponentProps<"input">) {
  const idErro = `${name}-erro`;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {rotulo}
      </label>
      <input
        id={name}
        name={name}
        // aria-invalid + aria-describedby: o leitor de tela anuncia o erro
        aria-invalid={erros?.length ? true : undefined}
        aria-describedby={erros?.length ? idErro : undefined}
        className={classeCampo}
        {...props}
      />
      {dica && !erros?.length && (
        <p className="mt-1 text-xs text-slate-500">{dica}</p>
      )}
      <ErrosCampo id={idErro} erros={erros} />
    </div>
  );
}

export function AreaTexto({
  rotulo,
  name,
  erros,
  ...props
}: PropsCampo & ComponentProps<"textarea">) {
  const idErro = `${name}-erro`;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {rotulo}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        aria-invalid={erros?.length ? true : undefined}
        aria-describedby={erros?.length ? idErro : undefined}
        className={classeCampo}
        {...props}
      />
      <ErrosCampo id={idErro} erros={erros} />
    </div>
  );
}

export function Selecao({
  rotulo,
  name,
  erros,
  children,
  ...props
}: PropsCampo & ComponentProps<"select">) {
  const idErro = `${name}-erro`;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {rotulo}
      </label>
      <select
        id={name}
        name={name}
        aria-invalid={erros?.length ? true : undefined}
        aria-describedby={erros?.length ? idErro : undefined}
        className={classeCampo}
        {...props}
      >
        {children}
      </select>
      <ErrosCampo id={idErro} erros={erros} />
    </div>
  );
}

/** Mensagem geral do formulário (sucesso em verde, erro em vermelho). */
export function Aviso({
  mensagem,
  sucesso,
}: {
  mensagem?: string;
  sucesso?: boolean;
}) {
  // aria-live: leitores de tela anunciam a mensagem quando ela aparece
  return (
    <p
      aria-live="polite"
      className={`text-sm ${sucesso ? "text-green-700" : "text-red-600"}`}
    >
      {mensagem}
    </p>
  );
}

const corStatus: Record<StatusOs, string> = {
  aberta: "bg-sky-100 text-sky-800",
  em_andamento: "bg-amber-100 text-amber-900",
  pronta: "bg-green-100 text-green-800",
  entregue: "bg-slate-200 text-slate-700",
};

export function EtiquetaStatus({ status }: { status: StatusOs }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${corStatus[status]}`}
    >
      {ROTULO_STATUS[status]}
    </span>
  );
}

export function EstadoVazio({
  children,
  acao,
}: {
  children: ReactNode;
  acao?: { href: string; rotulo: string };
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
      <p>{children}</p>
      {acao && (
        <Link href={acao.href} className={`${classeBotao.primario} mt-4`}>
          {acao.rotulo}
        </Link>
      )}
    </div>
  );
}

/** Tabela com rolagem horizontal no celular. */
export function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:text-slate-600 [&_thead]:bg-slate-50 [&_tr]:border-b [&_tr]:border-slate-100 [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

/** "Esqueleto" cinza usado nos loading.tsx enquanto os dados chegam. */
export function Esqueleto({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-10 rounded-md bg-slate-200" />
      ))}
    </div>
  );
}
