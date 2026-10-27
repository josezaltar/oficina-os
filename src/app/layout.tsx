import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// next/font baixa a fonte no build e serve pelo próprio site (sem depender do
// Google em tempo real). `variable` cria uma variável CSS usada no globals.css.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Com `template`, cada página só define o próprio título ("Clientes") e a
  // aba do navegador mostra "Clientes | Oficina OS".
  title: {
    template: "%s | Oficina OS",
    default: "Oficina OS",
  },
  description: "Sistema de gerenciamento de ordens de serviço",
};

// Layout RAIZ: é o único lugar com <html> e <body>. Tudo do site passa por
// aqui. O menu lateral NÃO fica aqui, porque a tela de login não tem menu;
// ele fica no layout do grupo (sistema). Veja src/app/(sistema)/layout.tsx.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
