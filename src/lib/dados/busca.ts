/**
 * Monta o padrão do ILIKE a partir do que a pessoa digitou na busca.
 * "joão" → "%joão%". Escapa % e _ para que sejam buscados literalmente
 * (no SQL, % e _ são curingas).
 */
export function termoBusca(busca?: string) {
  const limpo = busca?.trim();
  if (!limpo) return undefined;
  return `%${limpo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** searchParams pode trazer string, lista de strings ou nada. Pega a primeira. */
export function primeiroValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}
