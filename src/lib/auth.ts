// Etapa 7 troca isto pela checagem de login de verdade.
export async function exigirUsuario() {
  return null;
}

export async function exigirGerente(): Promise<
  { ok: true } | { ok: false; mensagem: string }
> {
  return { ok: true };
}
