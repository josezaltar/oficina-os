/*
  Proxy (etapa 7). Nas versões antigas do Next este arquivo se chamava
  `middleware.ts`; na versão 16 ele foi renomeado para `proxy.ts`.

  Ele roda ANTES de qualquer página. Aqui fazemos a checagem "otimista":
  sem sessão válida → redireciona para /login, guardando em ?de= a página
  que a pessoa queria abrir, para voltar a ela depois do login.

  A checagem completa (o usuário existe? é gerente?) fica em src/lib/auth.ts.
*/
import { NextResponse, type NextRequest } from "next/server";
import { NOME_COOKIE, abrirSelo } from "./lib/selo-sessao";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const selo = request.cookies.get(NOME_COOKIE)?.value;
  const sessao = selo ? await abrirSelo(selo) : null;
  const naTelaDeLogin = pathname === "/login";

  // Já logado tentando abrir o /login → vai para o painel
  if (sessao && naTelaDeLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Sem login em página interna → vai para o /login
  // (/demo é pública: é ela que faz o login da demonstração)
  if (!sessao && !naTelaDeLogin && pathname !== "/demo") {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("de", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Roda em tudo, MENOS arquivos estáticos (JS, CSS, imagens, favicon).
  // Sem isso, a tela de login nem conseguiria carregar o próprio CSS.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
