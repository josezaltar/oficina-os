import { sair } from "@/app/login/acoes";
import { obterUsuario } from "@/lib/auth";
import { MenuGerente } from "./menu-lateral";

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
    <>
      {/* Financeiro e usuários: só aparecem para o gerente */}
      {usuario.papel === "gerente" && (
        <div className="mt-3 border-t border-slate-700 pt-3 md:mt-6 md:pt-4">
          <p className="mb-1 hidden px-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase md:block">
            Gerência
          </p>
          <MenuGerente />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-700 px-3 pt-3 text-sm md:mt-6 md:block md:pt-4">
        <p>
          <span className="font-medium">{usuario.nome}</span>{" "}
          <span className="text-xs text-slate-400 capitalize md:block">
            {usuario.papel}
          </span>
        </p>
        <form action={sair} className="md:mt-2">
          <button
            type="submit"
            className="text-xs text-slate-400 underline hover:text-white"
          >
            Sair
          </button>
        </form>
      </div>
    </>
  );
}
