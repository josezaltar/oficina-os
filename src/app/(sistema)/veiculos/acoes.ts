"use server";
// Mesmo padrão de clientes/acoes.ts: login → Zod → banco → revalidar → redirecionar.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { veiculos } from "@/db/schema";
import { exigirGerente, exigirUsuario } from "@/lib/auth";
import {
  codigoErroPg,
  errosDoZod,
  lerCampos,
  type EstadoForm,
} from "@/lib/estado-form";
import { esquemaVeiculo } from "@/lib/validacao";

const CAMPOS = ["clienteId", "placa", "marca", "modelo", "ano"];

const PLACA_REPETIDA: EstadoForm = {
  erros: { placa: ["Já existe um veículo com esta placa."] },
  mensagem: "Corrija os campos destacados.",
};

export async function criarVeiculo(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirUsuario();

  const valores = lerCampos(formData, CAMPOS);
  const resultado = esquemaVeiculo.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  let id: number;
  try {
    const [novo] = await db
      .insert(veiculos)
      .values(resultado.data)
      .returning({ id: veiculos.id });
    id = novo.id;
  } catch (erro) {
    // 23505 = violou o UNIQUE da placa. O banco é a garantia final:
    // mesmo que dois atendentes cadastrem a mesma placa ao mesmo tempo.
    if (codigoErroPg(erro) === "23505") return { ...PLACA_REPETIDA, valores };
    throw erro;
  }

  revalidatePath("/veiculos");
  revalidatePath(`/clientes/${resultado.data.clienteId}`);
  redirect(`/veiculos/${id}`);
}

export async function atualizarVeiculo(
  id: number,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirUsuario();

  const valores = lerCampos(formData, CAMPOS);
  const resultado = esquemaVeiculo.safeParse(valores);
  if (!resultado.success) return errosDoZod(resultado.error, valores);

  try {
    await db.update(veiculos).set(resultado.data).where(eq(veiculos.id, id));
  } catch (erro) {
    if (codigoErroPg(erro) === "23505") return { ...PLACA_REPETIDA, valores };
    throw erro;
  }

  revalidatePath("/veiculos");
  revalidatePath(`/veiculos/${id}`);
  redirect(`/veiculos/${id}`);
}

export async function excluirVeiculo(
  id: number,
  _estado: EstadoForm,
): Promise<EstadoForm> {
  const permissao = await exigirGerente();
  if (!permissao.ok) return { mensagem: permissao.mensagem };

  try {
    await db.delete(veiculos).where(eq(veiculos.id, id));
  } catch (erro) {
    if (codigoErroPg(erro) === "23503") {
      return {
        mensagem:
          "Este veículo tem ordens de serviço no histórico e não pode ser excluído.",
      };
    }
    throw erro;
  }

  revalidatePath("/veiculos");
  redirect("/veiculos");
}
