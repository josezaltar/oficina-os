import { Esqueleto } from "@/components/ui";

// Mostrado enquanto a OS é buscada no banco (mesmo papel do (sistema)/loading.tsx).
export default function Carregando() {
  return (
    <div className="mx-auto max-w-[210mm] p-8">
      <Esqueleto linhas={8} />
    </div>
  );
}
