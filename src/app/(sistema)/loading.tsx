import { Esqueleto } from "@/components/ui";

/*
  loading.tsx (etapa 4): o Next embrulha a página num <Suspense> e mostra
  este componente enquanto a página (Server Component assíncrono) espera
  o banco. Como está em (sistema)/, vale para todas as páginas do grupo.
  O menu lateral, que fica no layout, continua aparecendo normalmente.
*/
export default function Carregando() {
  return (
    <div>
      <div className="mb-6 h-8 w-48 animate-pulse rounded-md bg-slate-200" />
      <Esqueleto />
    </div>
  );
}
