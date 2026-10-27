import type { Metadata } from "next";
import Link from "next/link";
import { FormBusca } from "@/components/form-busca";
import { Cabecalho, EstadoVazio, Tabela, classeBotao } from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import { listarVeiculos } from "@/lib/dados/veiculos";
import { formatarPlaca } from "@/lib/formato";

export const metadata: Metadata = { title: "Veículos" };

export default async function VeiculosPage({ searchParams }: PageProps<"/veiculos">) {
  const busca = primeiroValor((await searchParams).busca);
  const lista = await listarVeiculos(busca);

  return (
    <div>
      <Cabecalho titulo="Veículos" descricao="Caminhões, utilitários e carros atendidos.">
        <Link href="/veiculos/novo" className={classeBotao.primario}>
          Novo veículo
        </Link>
      </Cabecalho>

      <FormBusca action="/veiculos" valor={busca} placeholder="Placa, modelo ou cliente" />

      {lista.length === 0 ? (
        <EstadoVazio>
          {busca
            ? `Nenhum veículo encontrado para "${busca}".`
            : "Nenhum veículo cadastrado ainda."}
        </EstadoVazio>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Veículo</th>
              <th className="hidden sm:table-cell">Cliente</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td>
                  <Link href={`/veiculos/${v.id}`} className="font-mono font-medium hover:underline">
                    {formatarPlaca(v.placa)}
                  </Link>
                </td>
                <td>
                  {v.marca} {v.modelo}
                  {v.ano ? ` (${v.ano})` : ""}
                </td>
                <td className="hidden sm:table-cell">
                  <Link href={`/clientes/${v.clienteId}`} className="hover:underline">
                    {v.clienteNome}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  );
}
