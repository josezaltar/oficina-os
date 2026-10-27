import type { Metadata } from "next";

// Cada pasta com um page.tsx vira uma rota: esta é /veiculos
export const metadata: Metadata = { title: "Veículos" };

export default function Page() {
  return <h1 className="text-2xl font-bold">Veículos</h1>;
}
