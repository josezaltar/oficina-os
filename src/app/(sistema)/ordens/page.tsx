import type { Metadata } from "next";

// Cada pasta com um page.tsx vira uma rota: esta é /ordens
export const metadata: Metadata = { title: "Ordens de serviço" };

export default function Page() {
  return <h1 className="text-2xl font-bold">Ordens de serviço</h1>;
}
