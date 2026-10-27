/*
  Regras de vencimento (contas a pagar e pagamento das OS).

  Funções puras que trabalham com datas no formato "AAAA-MM-DD" (o mesmo do
  banco e do <input type="date">). Não usam fuso: "hoje" é sempre passado
  de fora (hojeEmSaoPaulo()), o que também deixa tudo fácil de testar.
*/

/** Avisar a partir de quantos dias antes do vencimento. */
export const DIAS_DE_AVISO = 2;

/** Dias entre duas datas "AAAA-MM-DD" (negativo = já passou). */
export function diasAte(hoje: string, vencimento: string) {
  // Date.UTC evita que horário de verão ou fuso mude a conta
  const [ah, mh, dh] = hoje.split("-").map(Number);
  const [av, mv, dv] = vencimento.split("-").map(Number);
  return Math.round((Date.UTC(av, mv - 1, dv) - Date.UTC(ah, mh - 1, dh)) / 86_400_000);
}

export type SituacaoVencimento = "paga" | "vencida" | "vence_hoje" | "vence_logo" | "em_dia" | "sem_data";

/**
 * Situação de algo que vence (conta ou OS a receber):
 * - paga: já foi quitada
 * - vencida: passou do vencimento
 * - vence_hoje / vence_logo (até DIAS_DE_AVISO dias): entra no alerta
 * - em_dia: falta mais tempo
 * - sem_data: não tem vencimento definido
 */
export function situacaoVencimento(
  hoje: string,
  vencimento: string | null,
  pagaEm: string | null,
): SituacaoVencimento {
  if (pagaEm) return "paga";
  if (!vencimento) return "sem_data";
  const dias = diasAte(hoje, vencimento);
  if (dias < 0) return "vencida";
  if (dias === 0) return "vence_hoje";
  if (dias <= DIAS_DE_AVISO) return "vence_logo";
  return "em_dia";
}

/** Precisa de alerta? (vencida, vence hoje ou nos próximos dias) */
export function precisaAlerta(situacao: SituacaoVencimento) {
  return situacao === "vencida" || situacao === "vence_hoje" || situacao === "vence_logo";
}

/** Texto curto para a tela: "Vencida há 3 dias", "Vence amanhã"... */
export function textoVencimento(hoje: string, vencimento: string | null, pagaEm: string | null) {
  const situacao = situacaoVencimento(hoje, vencimento, pagaEm);
  if (situacao === "paga") return `Paga em ${dataBr(pagaEm!)}`;
  if (situacao === "sem_data") return "Sem vencimento";
  const dias = diasAte(hoje, vencimento!);
  if (dias < -1) return `Vencida há ${-dias} dias`;
  if (dias === -1) return "Venceu ontem";
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  if (dias <= DIAS_DE_AVISO) return `Vence em ${dias} dias`;
  return `Vence ${dataBr(vencimento!)}`;
}

/** "2026-10-27" → "27/10/2026" (sem passar por Date, sem fuso) */
export function dataBr(data: string) {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

/** Primeiro e último dia do mês de "AAAA-MM": ["2026-10-01", "2026-10-31"] */
export function limitesDoMes(mes: string): [string, string] {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return [`${mes}-01`, `${mes}-${String(ultimo).padStart(2, "0")}`];
}

/** "2026-10" → "2026-09" (deslocamento em meses, pode ser negativo) */
export function somarMeses(mes: string, quantos: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + quantos, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
