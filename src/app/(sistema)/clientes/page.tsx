import type { Metadata } from "next";

// Cada pasta com um page.tsx vira uma rota: esta é /clientes
export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return <h1 className="text-2xl font-bold">Clientes</h1>;
}
