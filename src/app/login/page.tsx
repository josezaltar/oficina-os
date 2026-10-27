import type { Metadata } from "next";
import { Suspense } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { FormLogin } from "@/components/form-login";
import { Esqueleto } from "@/components/ui";
import { primeiroValor } from "@/lib/dados/busca";
import { entrarDemo } from "./acoes";

export const metadata: Metadata = { title: "Entrar" };

/*
  A tela de login fica FORA do grupo (sistema), então não tem menu lateral.
  O cartão é estático; só o conteúdo que lê a URL (?de=) espera dentro do
  <Suspense>, como pede o Cache Components.
*/
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <p className="text-2xl font-bold tracking-tight">
          Oficina <span className="text-amber-500">OS</span>
        </p>
        <p className="mt-1 mb-6 text-sm text-slate-600">
          Entre com a sua conta de funcionário.
        </p>
        <Suspense fallback={<Esqueleto linhas={3} />}>
          <ConteudoLogin searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ConteudoLogin({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const de = primeiroValor((await searchParams).de);
  const modoDemo = process.env.DEMO_MODE === "true";

  return (
    <>
      <FormLogin de={de} />
      {modoDemo && (
        <div className="mt-6 border-t border-slate-200 pt-6">
          {/* Form com Server Action direto, sem useActionState: não há erro para mostrar */}
          <form action={entrarDemo}>
            {de && <input type="hidden" name="de" value={de} />}
            <BotaoEnviar variante="secundario" enviando="Entrando...">
              Entrar como demonstração
            </BotaoEnviar>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Conta de gerente com dados fictícios. Fique à vontade para testar.
          </p>
        </div>
      )}
    </>
  );
}
