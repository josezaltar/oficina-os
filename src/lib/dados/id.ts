import { notFound } from "next/navigation";

/**
 * Converte o [id] da URL em número. Se não for um número válido
 * (ex.: /clientes/abc), mostra a página 404 com notFound().
 */
export function lerId(texto: string) {
  const id = Number(texto);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return id;
}
