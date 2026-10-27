"use client";
// ↑ Este componente precisa rodar no navegador porque usa `usePathname`
// (um hook que lê a URL atual). Hooks só funcionam em Client Components.
//
// Repare que só ESTE pedaço é client. O layout que usa o menu continua sendo
// Server Component. Regra de ouro: deixe o "use client" o mais "embaixo"
// possível na árvore, só onde precisa de interatividade.

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", rotulo: "Painel" },
  { href: "/ordens", rotulo: "Ordens de serviço" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/veiculos", rotulo: "Veículos" },
];

/**
 * Diz se um link do menu está ativo.
 * - "/" só é ativo na página inicial exata (senão ficaria ativo sempre).
 * - Os outros ficam ativos também nas subpáginas: /clientes/12 ativa "Clientes".
 */
export function linkAtivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MenuLateral({ extras = [] }: { extras?: typeof links }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu principal">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {[...links, ...extras].map((link) => {
          const ativo = linkAtivo(pathname, link.href);
          return (
            <li key={link.href}>
              {/*
                <Link> navega SEM recarregar a página: o Next troca só o
                conteúdo que mudou. Com <a href> o navegador baixaria tudo
                de novo. Esse é o critério de "pronto" da etapa 1.
              */}
              <Link
                href={link.href}
                // aria-current avisa leitores de tela qual é a página atual
                aria-current={ativo ? "page" : undefined}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {link.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
