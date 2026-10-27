"use server";
import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { esquemaEditarUsuario, esquemaNovoUsuario } from "@/lib/validacao";

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

/*
  Regras de segurança ao editar/excluir usuários:
  - a oficina precisa ter SEMPRE pelo menos um gerente (senão ninguém mais
    consegue cadastrar usuários nem ver o financeiro);
  - ninguém exclui a própria conta (evita se trancar fora do sistema).
*/
async function totalDeGerentes() {
  const [{ total }] = await db
    .select({ total: count() })
    .from(usuarios)
    .where(eq(usuarios.papel, "gerente"));
  return total;
}

export async function atualizarUsuario(
  id: number,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };

  const campos = lerCampos(formData, ["nome", "email", "senha", "papel"]);
  const resultado = esquemaEditarUsuario.safeParse(campos);
  const { senha: _senha, ...valores } = campos;
  if (!resultado.success) return errosDoZod(resultado.error, valores);
  const { senha, ...dados } = resultado.data;

  const atual = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id), columns: { papel: true } });
  if (!atual) return { mensagem: "Usuário não encontrado." };
  if (atual.papel === "gerente" && dados.papel !== "gerente" && (await totalDeGerentes()) <= 1) {
    return {
      erros: { papel: ["Este é o único gerente. Crie outro gerente antes de mudar o papel."] },
      mensagem: "Corrija os campos destacados.",
      valores,
    };
  }

  try {
    await db
      .update(usuarios)
      // Senha em branco = mantém a atual; senão grava o hash da nova
      .set({ ...dados, ...(senha ? { senhaHash: await gerarHash(senha) } : {}) })
      .where(eq(usuarios.id, id));
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
  redirect("/usuarios");
}

export async function excluirUsuario(id: number, _estado: EstadoForm): Promise<EstadoForm> {
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };
  if (permissao.usuario.id === id) {
    return { mensagem: "Você não pode excluir a própria conta." };
  }

  const alvo = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id), columns: { papel: true } });
  if (!alvo) return { mensagem: "Usuário não encontrado." };
  if (alvo.papel === "gerente" && (await totalDeGerentes()) <= 1) {
    return { mensagem: "Este é o único gerente e não pode ser excluído." };
  }

  // As OS que ele abriu ficam (o campo "aberta por" vira vazio: onDelete set null)
  await db.delete(usuarios).where(eq(usuarios.id, id));
  revalidatePath("/usuarios");
  redirect("/usuarios");
}
