import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { FormUsuario } from "@/components/form-usuario";
import { Cabecalho, Cartao, Tabela } from "@/components/ui";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { formatarData } from "@/lib/formato";

export const metadata: Metadata = { title: "Usuários" };

/*
  Papéis (etapa 7):
  - gerente: tudo, inclusive excluir registros, ver faturamento e criar usuários;
  - atendente: cadastra clientes e veículos e lança ordens de serviço.
*/
export default async function UsuariosPage() {
  const usuario = await exigirUsuario();

  if (usuario.papel !== "gerente") {
    return (
      <Cartao titulo="Acesso restrito">
        <p className="text-sm text-slate-600">Apenas gerentes podem gerenciar usuários.</p>
      </Cartao>
    );
  }

  const lista = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      papel: usuarios.papel,
      criadoEm: usuarios.criadoEm,
    })
    .from(usuarios)
    .orderBy(asc(usuarios.nome));

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Usuários" descricao="Funcionários com acesso ao sistema." />

      <Tabela>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Papel</th>
            <th className="hidden sm:table-cell">Desde</th>
            <th>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lista.map((u) => (
            <tr key={u.id}>
              <td className="font-medium">
                {u.nome}
                {u.id === usuario.id && <span className="ml-2 text-xs font-normal text-slate-500">(você)</span>}
              </td>
              <td>{u.email}</td>
              <td className="capitalize">{u.papel}</td>
              <td className="hidden sm:table-cell">{formatarData(u.criadoEm)}</td>
              <td className="text-right">
                <Link href={`/usuarios/${u.id}/editar`} className="text-sm font-medium text-amber-700 hover:underline">
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Tabela>

      <Cartao titulo="Novo usuário">
        <FormUsuario />
      </Cartao>
    </div>
  );
}
