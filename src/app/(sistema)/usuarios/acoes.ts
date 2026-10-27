"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { exigirGerente } from "@/lib/auth";
import {
  codigoErroPg,
  errosDoZod,
  lerCampos,
  type EstadoForm,
} from "@/lib/estado-form";
import { gerarHash } from "@/lib/senha";
import { esquemaNovoUsuario } from "@/lib/validacao";

export async function criarUsuario(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  // Só gerente cadastra funcionário. A página também esconde o formulário,
  // mas a checagem que vale é esta, no servidor.
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };

  const campos = lerCampos(formData, ["nome", "email", "senha", "papel"]);
  const resultado = esquemaNovoUsuario.safeParse(campos);
  // A senha NÃO volta para o formulário em caso de erro
  const { senha: _senha, ...valores } = campos;
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  const { senha, ...dados } = resultado.data;
  try {
    await db.insert(usuarios).values({ ...dados, senhaHash: await gerarHash(senha) });
  } catch (erro) {
    if (codigoErroPg(erro) === "23505") {
      return {
        erros: { email: ["Já existe um usuário com este e-mail."] },
        mensagem: "Corrija os campos destacados.",
        valores,
      };
    }
    throw erro;
  }

  revalidatePath("/usuarios");
  return { sucesso: true, mensagem: `Usuário ${dados.nome} criado.` };
}
