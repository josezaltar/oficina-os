/*
  Formatação e leitura de valores no padrão brasileiro.
  Funções puras: rodam no servidor e no navegador, e têm testes em formato.test.ts.
*/

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 123450 → "R$ 1.234,50" */
export function formatarMoeda(centavos: number) {
  return moeda.format(centavos / 100);
}

/*
  Datas: o servidor da Vercel roda em UTC. Sem fixar o fuso, uma OS aberta
  às 22h em Divinópolis apareceria com a data do dia seguinte.
*/
const FUSO = "America/Sao_Paulo";

/** Date → "27/10/2026" */
export function formatarData(data: Date) {
  return data.toLocaleDateString("pt-BR", { timeZone: FUSO });
}

/** Date → "27/10/2026 14:30" */
export function formatarDataHora(data: Date) {
  return data.toLocaleString("pt-BR", {
    timeZone: FUSO,
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Número com vírgula: 2.5 → "2,5" */
export function formatarNumero(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/**
 * Lê um número digitado no formato brasileiro.
 * "1.234,56" → 1234.56 | "2,5" → 2.5 | "10" → 10 | "abc" → NaN
 */
export function lerNumeroBr(texto: string) {
  const limpo = texto.trim().replace(/\s|R\$/g, "");
  if (limpo === "") return NaN;
  // Se tem vírgula, os pontos são separadores de milhar: "1.234,56".
  // Sem vírgula, aceita ponto como decimal: "2.5" (alguém digitou no estilo americano).
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return NaN;
  return Number(normalizado);
}

/** "1.234,56" → 123456 centavos (ou NaN se inválido) */
export function lerMoedaEmCentavos(texto: string) {
  const valor = lerNumeroBr(texto);
  return Number.isNaN(valor) ? NaN : Math.round(valor * 100);
}

/** 123456 → "1.234,56" (para preencher campos de formulário) */
export function centavosParaCampo(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Placa: tira hífen/espaço e põe em maiúsculas. "abc-1d23" → "ABC1D23" */
export function normalizarPlaca(placa: string) {
  return placa.replace(/[\s-]/g, "").toUpperCase();
}

/** "ABC1D23" → "ABC-1D23" (só para exibir) */
export function formatarPlaca(placa: string) {
  return `${placa.slice(0, 3)}-${placa.slice(3)}`;
}
