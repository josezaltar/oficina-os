import type { Metadata } from "next";
import Link from "next/link";
import { FormBusca } from "@/components/form-busca";
import { Cabecalho, EstadoVazio, Tabela, classeBotao } from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import { categoriasDeServico, listarTabelaServicos } from "@/lib/dados/servicos";
import { formatarMoeda } from "@/lib/formato";

export const metadata: Metadata = { title: "Serviços" };

/*
  Tabela de serviços da oficina, com preço. É dela que vêm as sugestões
  da coluna Descrição na OS: escolher um serviço preenche o preço.
  Filtros pela URL: ?busca=junta&categoria=MOTOR
*/
export default async function ServicosPage({ searchParams }: PageProps<"/servicos">) {
  const parametros = await searchParams;
  const busca = primeiroValor(parametros.busca);
  const categoria = primeiroValor(parametros.categoria);
  const [lista, categorias] = await Promise.all([
    listarTabelaServicos({ busca, categoria }),
    categoriasDeServico(),
  ]);

  const linkCategoria = (c?: string) => {
    const p = new URLSearchParams();
    if (c) p.set("categoria", c);
    if (busca) p.set("busca", busca);
    const qs = p.toString();
    return qs ? `/servicos?${qs}` : "/servicos";
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
                <th className="w-24">Código</th>
                <th>Descrição</th>
                <th className="hidden sm:table-cell">Categoria</th>
                <th className="text-right">Preço</th>
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
