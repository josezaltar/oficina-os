import Link from "next/link";
import { sair } from "@/app/login/acoes";
import { obterUsuario } from "@/lib/auth";

/*
  Nome do usuário + "Sair", no rodapé do menu lateral.

  Este componente lê o cookie de sessão. Com Cache Components, quem lê
  cookies precisa ficar dentro de um <Suspense> (veja (sistema)/layout.tsx).
  Assim o resto do layout aparece na hora e só este pedaço espera.

  No celular fica tudo numa linha só (flex); no computador (md:), empilhado.
*/
export async function AreaUsuario() {
  const usuario = await obterUsuario();
  if (!usuario) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-700 px-3 pt-3 text-sm md:mt-6 md:block md:pt-4">
      {usuario.papel === "gerente" && (
        <Link
          href="/usuarios"
          className="font-medium text-slate-300 hover:text-white md:mb-3 md:block"
        >
          Usuários
        </Link>
      )}
      <p>
        <span className="font-medium">{usuario.nome}</span>{" "}
        <span className="text-xs text-slate-400 capitalize md:block">{usuario.papel}</span>
      </p>
      <form action={sair} className="md:mt-2">
        <button type="submit" className="text-xs text-slate-400 underline hover:text-white">
          Sair
        </button>
      </form>
    </div>
  );
}
