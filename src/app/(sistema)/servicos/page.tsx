import type { Metadata } from "next";
import Link from "next/link";
import { FormBusca } from "@/components/form-busca";
import { Cabecalho, EstadoVazio, Tabela, classeBotao } from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import {
  COLUNAS_ORDENAVEIS,
  categoriasDeServico,
  listarTabelaServicos,
  type ColunaOrdenavel,
  type Direcao,
} from "@/lib/dados/servicos";
import { formatarMoeda } from "@/lib/formato";

export const metadata: Metadata = { title: "Serviços" };

/*
  Tabela de serviços da oficina, com preço. É dela que vêm as sugestões
  da coluna Descrição na OS: escolher um serviço preenche o preço.
  Filtros pela URL: ?busca=junta&categoria=MOTOR
  Ordenação pela URL: ?ordenar=preco&dir=desc (clicando no título da coluna)
*/
export default async function ServicosPage({ searchParams }: PageProps<"/servicos">) {
  const parametros = await searchParams;
  const busca = primeiroValor(parametros.busca);
  const categoria = primeiroValor(parametros.categoria);
  // Só aceita colunas conhecidas (o valor vem da URL, pode ser qualquer coisa)
  const ordenarPor =
    COLUNAS_ORDENAVEIS.find((c) => c === primeiroValor(parametros.ordenar)) ?? "descricao";
  const direcao: Direcao = primeiroValor(parametros.dir) === "desc" ? "desc" : "asc";

  const [lista, categorias] = await Promise.all([
    listarTabelaServicos({ busca, categoria, ordenarPor, direcao }),
    categoriasDeServico(),
  ]);

  /** Monta o link mantendo busca, categoria e ordem, trocando só o que mudou. */
  const link = (mudancas: Record<string, string | undefined>) => {
    const atual: Record<string, string | undefined> = {
      busca,
      categoria,
      ordenar: ordenarPor === "descricao" ? undefined : ordenarPor,
      dir: direcao === "asc" ? undefined : direcao,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...atual, ...mudancas })) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/servicos?${qs}` : "/servicos";
  };
  const linkCategoria = (c?: string) => link({ categoria: c });

  // Para onde o título de cada coluna leva: mesma coluna inverte a direção
  const ordemDe = (coluna: ColunaOrdenavel) => {
    const ativa = ordenarPor === coluna;
    const proxima: Direcao = ativa && direcao === "asc" ? "desc" : "asc";
    return {
      ativa,
      direcao,
      href: link({ ordenar: coluna === "descricao" ? undefined : coluna, dir: proxima === "asc" ? undefined : "desc" }),
    };
  };

  return (
    <div>
      <Cabecalho
        titulo="Serviços"
        descricao="Tabela de preços da oficina. Na OS, escolher um serviço preenche o preço."
      >
        {/* Imprime a tabela com os preços de hoje (respeita a categoria escolhida) */}
        <Link
          href={categoria ? `/imprimir/servicos?categoria=${encodeURIComponent(categoria)}` : "/imprimir/servicos"}
          className={classeBotao.secundario}
        >
          Imprimir tabela
        </Link>
        <Link href="/servicos/novo" className={classeBotao.primario}>
          Novo serviço
        </Link>
      </Cabecalho>

      {categorias.length > 0 && (
        <nav aria-label="Filtrar por categoria" className="mb-4 flex flex-wrap gap-2">
          {[undefined, ...categorias].map((c) => {
            const ativo = c === categoria;
            return (
              <Link
                key={c ?? "todas"}
                href={linkCategoria(c)}
                aria-current={ativo ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  ativo
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {c ?? "Todas"}
              </Link>
            );
          })}
        </nav>
      )}

      <FormBusca action="/servicos" valor={busca} placeholder="Descrição ou código">
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        {ordenarPor !== "descricao" && <input type="hidden" name="ordenar" value={ordenarPor} />}
        {direcao === "desc" && <input type="hidden" name="dir" value="desc" />}
      </FormBusca>

      {lista.length === 0 ? (
        <EstadoVazio acao={busca || categoria ? undefined : { href: "/servicos/novo", rotulo: "Cadastrar o primeiro serviço" }}>
          {busca || categoria ? "Nenhum serviço encontrado." : "Nenhum serviço cadastrado ainda."}
        </EstadoVazio>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600">
            {lista.length} {lista.length === 1 ? "serviço" : "serviços"}
          </p>
          <Tabela>
            <thead>
              <tr>
                <TituloOrdenavel {...ordemDe("referencia")} className="w-24">Código</TituloOrdenavel>
                <TituloOrdenavel {...ordemDe("descricao")}>Descrição</TituloOrdenavel>
                <TituloOrdenavel {...ordemDe("categoria")} className="hidden sm:table-cell">
                  Categoria
                </TituloOrdenavel>
                <TituloOrdenavel {...ordemDe("preco")} className="text-right">Preço</TituloOrdenavel>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="font-mono text-xs text-slate-600">{s.referencia ?? "—"}</td>
                  <td>
                    <Link href={`/servicos/${s.id}/editar`} className="font-medium hover:underline">
                      {s.descricao}
                    </Link>
                  </td>
                  <td className="hidden text-xs text-slate-600 sm:table-cell">{s.categoria ?? "—"}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">
                    {s.precoCentavos != null ? formatarMoeda(s.precoCentavos) : <span className="text-slate-400">sem preço</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </>
      )}
    </div>
  );
}

/*
  Título de coluna clicável: clicar ordena por ela (A→Z / menor→maior);
  clicar de novo na mesma coluna inverte. A seta mostra a ordem atual.
  É só um <Link> para outra URL: funciona sem JavaScript, e o link pode
  ser salvo ou compartilhado já com a ordem escolhida.
*/
function TituloOrdenavel({
  href,
  ativa,
  direcao,
  className = "",
  children,
}: {
  href: string;
  ativa: boolean;
  direcao: Direcao;
  className?: string;
  children: string;
}) {
  return (
    <th className={className} aria-sort={ativa ? (direcao === "asc" ? "ascending" : "descending") : undefined}>
      <Link
        href={href}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${ativa ? "text-slate-900" : ""}`}
        title={`Ordenar por ${children.toLowerCase()}`}
      >
        {children}
        <span aria-hidden="true" className={ativa ? "" : "text-slate-300"}>
          {ativa ? (direcao === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Link>
    </th>
  );
}
