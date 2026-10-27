import { MenuLateral } from "@/components/menu-lateral";

/*
  Pastas entre parênteses, como (sistema), são "route groups":
  organizam arquivos SEM aparecer na URL. /clientes continua sendo /clientes,
  não /sistema/clientes.

  Serve para dar um layout só para um grupo de páginas: tudo dentro de
  (sistema) ganha o menu lateral; a página de login (fora do grupo) não.
*/
export default function SistemaLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* print:hidden → o menu não sai na impressão */}
      <aside className="bg-slate-900 p-4 text-white md:w-60 md:shrink-0 print:hidden">
        <p className="mb-4 px-3 text-lg font-bold tracking-tight">
          Oficina <span className="text-amber-400">OS</span>
        </p>
        <MenuLateral />
      </aside>

      {/* O conteúdo de cada página entra no lugar de {children} */}
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
