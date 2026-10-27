/*
  Regras de negócio da ordem de serviço.

  São funções "puras": recebem dados e devolvem um resultado, sem acessar
  banco, cookies ou tela. Isso tem duas vantagens:
  1. São fáceis de testar (veja regras-os.test.ts, etapa 9).
  2. Podem ser usadas no servidor (para valer de verdade) e no navegador
     (só para mostrar uma prévia), sem duplicar código.
*/
import type { StatusOs } from "@/db/schema";

// Ordem oficial do fluxo. O índice de cada status é a "posição" dele.
export const FLUXO_STATUS: StatusOs[] = [
  "aberta",
  "em_andamento",
  "pronta",
  "entregue",
];

export const ROTULO_STATUS: Record<StatusOs, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  pronta: "Pronta",
  entregue: "Entregue",
};

type ItemCalculavel = { quantidade: number; valorUnitarioCentavos: number };

/** Subtotal de um item em centavos, arredondado para o centavo mais próximo. */
export function subtotalCentavos(item: ItemCalculavel) {
  // A quantidade pode ser quebrada (2,5 L). O resultado é arredondado
  // porque não existe meio centavo.
  return Math.round(item.quantidade * item.valorUnitarioCentavos);
}

/** Total da OS: soma dos subtotais. */
export function calcularTotalCentavos(itens: ItemCalculavel[]) {
  return itens.reduce((total, item) => total + subtotalCentavos(item), 0);
}

/**
 * Para quais status a OS pode ir a partir do status atual.
 * Regra: avança uma etapa ou volta uma etapa. "Entregue" é final.
 */
export function statusPermitidos(atual: StatusOs): StatusOs[] {
  if (atual === "entregue") return [];
  const posicao = FLUXO_STATUS.indexOf(atual);
  const permitidos: StatusOs[] = [];
  if (posicao > 0) permitidos.push(FLUXO_STATUS[posicao - 1]); // voltar
  permitidos.push(FLUXO_STATUS[posicao + 1]); // avançar
  return permitidos;
}

export function podeMudarStatus(de: StatusOs, para: StatusOs) {
  return statusPermitidos(de).includes(para);
}

/** Itens só podem ser alterados enquanto o serviço não terminou. */
export function podeEditarItens(status: StatusOs) {
  return status === "aberta" || status === "em_andamento";
}

/** Só dá para excluir uma OS que ainda não foi entregue (protege o faturamento). */
export function podeExcluirOs(status: StatusOs) {
  return status !== "entregue";
}
