import type { Metadata } from "next";
import { connection } from "next/server";
import { FormOrdem } from "@/components/form-ordem";
import { Cabecalho } from "@/components/ui";
import { db } from "@/db";
import { veiculos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { dadosPorPlaca, sugestoesDoBloco } from "@/lib/dados/bloco";
import { primeiroValor } from "@/lib/dados/busca";
import { hojeEmSaoPaulo } from "@/lib/formato";
import { consultarPlaca, criarOrdem } from "../acoes";

export const metadata: Metadata = { title: "Nova OS" };

/*
  Nova OS no formato do bloco de papel.
  /ordens/nova?veiculoId=3 (botão "Abrir OS" do veículo) já abre com o bloco
  preenchido.
*/
export default async function NovaOrdemPage({ searchParams }: PageProps<"/ordens/nova">) {
  const veiculoId = Number(primeiroValor((await searchParams).veiculoId));

  // A data de hoje depende do momento do acesso: connection() avisa o Next
  await connection();
  const hoje = hojeEmSaoPaulo();

  const [sugestoes, inicial] = await Promise.all([
    sugestoesDoBloco(),
    Number.isInteger(veiculoId) && veiculoId > 0 ? dadosDoVeiculo(veiculoId) : null,
  ]);

  return (
    <div>
      <Cabecalho
        titulo="Nova ordem de serviço"
        descricao="Comece pela placa. Linhas de itens em branco são ignoradas."
      />
      <FormOrdem
        acao={criarOrdem}
        consultarPlaca={consultarPlaca}
        hoje={hoje}
        inicial={inicial ?? undefined}
        sugestoes={sugestoes}
      />
    </div>
  );
}

async function dadosDoVeiculo(id: number) {
  const [veiculo] = await db
    .select({ placa: veiculos.placa })
    .from(veiculos)
    .where(eq(veiculos.id, id))
    .limit(1);
  if (!veiculo) return null;
  const dados = await dadosPorPlaca(veiculo.placa);
  return dados ? { ...dados, placa: veiculo.placa } : null;
}
