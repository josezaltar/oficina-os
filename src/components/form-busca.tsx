import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { classeBotao } from "./ui";

/*
  Busca pela URL (etapa 4): o <Form> do Next, com action="/clientes",
  transforma o envio em navegação para /clientes?busca=texto, sem recarregar.

  Por que na URL e não num useState?
  - dá para copiar o link e mandar para alguém com a busca já feita;
  - o botão "voltar" do navegador funciona;
  - a página (Server Component) lê `searchParams` e busca no banco direto.
*/
export function FormBusca({
  action,
  valor,
  placeholder,
  children,
}: {
  action: string;
  valor?: string;
  placeholder: string;
  /** campos extras (ex.: filtro de status) */
  children?: ReactNode;
}) {
  return (
    <Form action={action} className="mb-4 flex flex-wrap gap-2" role="search">
      <label htmlFor="busca" className="sr-only">
        Buscar
      </label>
      <input
        id="busca"
        name="busca"
        type="search"
        defaultValue={valor}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none sm:max-w-sm"
      />
      {children}
      <button type="submit" className={classeBotao.secundario}>
        Buscar
      </button>
      {valor && (
        <Link href={action} className="self-center text-sm text-slate-600 underline">
          Limpar
        </Link>
      )}
    </Form>
  );
}
