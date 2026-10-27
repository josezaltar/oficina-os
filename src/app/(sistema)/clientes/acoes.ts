"use server";
/*
  Server Actions (etapa 5): funções que rodam NO SERVIDOR mas podem ser
  chamadas direto por um <form>. Não precisa criar API nem usar fetch.

  O "use server" no topo marca todas as funções exportadas deste arquivo
  como Server Actions. Cada uma:
  1. confere o login (nunca confie no navegador);
  2. valida os dados com Zod;
  3. grava no banco;
  4. chama revalidatePath para as telas mostrarem o dado novo;
  5. redireciona ou devolve um estado com erros para o formulário.
*/
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { exigirGerente, exigirUsuario } from "@/lib/auth";
import {
  codigoErroPg,
  errosDoZod,
  lerCampos,
  type EstadoForm,
} from "@/lib/estado-form";
import { esquemaCliente } from "@/lib/validacao";

const CAMPOS = ["nome", "telefone", "email", "documento", "cidade", "cep", "numero", "observacoes"];

/*
  Assinatura (estadoAnterior, formData): é o formato exigido pelo
  useActionState. O estado anterior não é usado aqui, mas precisa existir.
*/
export async function criarCliente(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirUsuario();

  const valores = lerCampos(formData, CAMPOS);
  const resultado = esquemaCliente.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  const [novo] = await db
    .insert(clientes)
    .values(resultado.data)
    .returning({ id: clientes.id });

  revalidatePath("/clientes");
  // redirect "lança" uma exceção especial: o código depois dele não roda.
  redirect(`/clientes/${novo.id}`);
}

/*
  Para editar, precisamos saber QUAL cliente. O id é "amarrado" na action
  pela página com .bind(): atualizarCliente.bind(null, cliente.id).
  Assim o id não fica num <input hidden> que alguém poderia alterar.
*/
export async function atualizarCliente(
  id: number,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirUsuario();

  const valores = lerCampos(formData, CAMPOS);
  const resultado = esquemaCliente.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  await db.update(clientes).set(resultado.data).where(eq(clientes.id, id));

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function excluirCliente(
  id: number,
  _estado: EstadoForm,
): Promise<EstadoForm> {
  // Excluir é só para gerente (etapa 7)
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };

  try {
    await db.delete(clientes).where(eq(clientes.id, id));
  } catch (erro) {
    // 23503: o banco barrou porque o cliente ainda tem veículos (onDelete restrict)
    if (codigoErroPg(erro) === "23503") {
      return {
        mensagem:
          "Este cliente tem veículos cadastrados. Exclua ou transfira os veículos antes.",
      };
    }
    throw erro;
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
