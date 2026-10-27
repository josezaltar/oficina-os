import type { Metadata } from "next";
import Link from "next/link";
import { FormBusca } from "@/components/form-busca";
import { Cabecalho, EstadoVazio, Tabela, classeBotao } from "@/components/ui";
import { listarClientes } from "@/lib/dados/clientes";
import { primeiroValor } from "@/lib/dados/busca";

export const metadata: Metadata = { title: "Clientes" };

/*
  Server Component assíncrono (etapa 4): roda no servidor, busca no banco
  DIRETO (sem API, sem useEffect) e manda o HTML pronto para o navegador.

  `searchParams` é uma Promise com os parâmetros da URL (?busca=...).
  Enquanto este componente espera o banco, o Next mostra o loading.tsx
  mais próximo, que fica em (sistema)/loading.tsx.
*/
export default async function ClientesPage({
  searchParams,
}: PageProps<"/clientes">) {
  const busca = primeiroValor((await searchParams).busca);
  const lista = await listarClientes(busca);

  return (
    <div>
      <Cabecalho titulo="Clientes" descricao="Pessoas e empresas atendidas pela oficina.">
        <Link href="/clientes/novo" className={classeBotao.primario}>
          Novo cliente
        </Link>
      </Cabecalho>

      <FormBusca
        action="/clientes"
        valor={busca}
        placeholder="Nome, telefone ou CPF/CNPJ"
      />

      {lista.length === 0 ? (
        <EstadoVazio
          acao={busca ? undefined : { href: "/clientes/novo", rotulo: "Cadastrar o primeiro cliente" }}
        >
          {busca
            ? `Nenhum cliente encontrado para "${busca}".`
            : "Nenhum cliente cadastrado ainda."}
        </EstadoVazio>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th className="hidden sm:table-cell">CPF/CNPJ</th>
              <th className="text-right">Veículos</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-slate-50">
                <td>
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {cliente.nome}
                  </Link>
                </td>
                <td className="whitespace-nowrap">{cliente.telefone}</td>
                <td className="hidden sm:table-cell">{cliente.documento ?? "—"}</td>
                <td className="text-right">{cliente.totalVeiculos}</td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  );
}
