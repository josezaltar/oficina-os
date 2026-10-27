import Link from "next/link";
import { sair } from "@/app/login/acoes";
import { obterUsuario } from "@/lib/auth";

/*
  Nome do usuário + "Sair", no rodapé do menu lateral.

  Este componente lê o cookie de sessão. Com Cache Components, quem lê
  cookies precisa ficar dentro de um <Suspense> (veja (sistema)/layout.tsx).
  Assim o resto do layout aparece na hora e só este pedaço espera.
*/
export async function AreaUsuario() {
  const usuario = await obterUsuario();
  if (!usuario) return null;

  return (
    <div className="mt-6 border-t border-slate-700 pt-4 text-sm">
      {usuario.papel === "gerente" && (
        <Link
          href="/usuarios"
          className="mb-3 block rounded-md px-3 py-2 font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Usuários
        </Link>
      )}
      <p className="px-3 font-medium">{usuario.nome}</p>
      <p className="px-3 text-xs text-slate-400 capitalize">{usuario.papel}</p>
      <form action={sair} className="mt-2 px-3">
        <button type="submit" className="text-xs text-slate-400 underline hover:text-white">
          Sair
        </button>
      </form>
    </div>
  );
}
