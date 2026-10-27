/*
  Sessão de login guardada num cookie CRIPTOGRAFADO (iron-session).

  Como funciona: no login, gravamos { usuarioId, papel } num cookie. Antes,
  o iron-session "sela" esses dados com a SESSION_PASSWORD (criptografa e
  assina). O navegador guarda só um texto embaralhado: não dá para ler nem
  alterar (trocar "atendente" por "gerente") sem a senha, que fica no servidor.

  Este arquivo não usa nada do Next de propósito: assim ele pode ser usado
  tanto no proxy.ts quanto nas páginas e actions.
*/
import { sealData, unsealData } from "iron-session";
import type { Papel } from "@/db/schema";

export const NOME_COOKIE = "oficina_sessao";

// Duração do login: 12 horas (um turno longo de trabalho)
export const DURACAO_SEGUNDOS = 60 * 60 * 12;

export type DadosSessao = { usuarioId: number; papel: Papel };

function senha() {
  const valor = process.env.SESSION_PASSWORD;
  if (!valor || valor.length < 32) {
    throw new Error(
      "Defina SESSION_PASSWORD no .env com pelo menos 32 caracteres (veja .env.example).",
    );
  }
  return valor;
}

export function selar(dados: DadosSessao) {
  return sealData(dados, { password: senha(), ttl: DURACAO_SEGUNDOS });
}

/** Abre o selo. Se for inválido, adulterado ou expirado, devolve null. */
export async function abrirSelo(selo: string): Promise<DadosSessao | null> {
  try {
    const dados = await unsealData<Partial<DadosSessao>>(selo, {
      password: senha(),
      ttl: DURACAO_SEGUNDOS,
    });
    return dados.usuarioId ? (dados as DadosSessao) : null;
  } catch {
    return null;
  }
}
