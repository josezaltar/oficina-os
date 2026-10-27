// Etapa 7 troca isto pela checagem de login de verdade.
export async function exigirUsuario() {
  return { id: null as number | null, nome: "", papel: "gerente" as const };
}

export async function exigirGerente(): Promise<
  { ok: true } | { ok: false; mensagem: string }
> {
  return { ok: true };
}
