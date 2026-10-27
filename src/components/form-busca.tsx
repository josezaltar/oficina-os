"use client";
/*
  Busca que filtra ENQUANTO se digita.

  A busca continua morando na URL (/servicos?busca=junta), como na etapa 4:
  - dá para copiar o link e mandar para alguém com a busca já feita;
  - o botão "voltar" do navegador funciona;
  - a página (Server Component) lê `searchParams` e busca no banco direto.

  A diferença é QUANDO a URL muda: a cada letra, com uma pequena espera
  (debounce de 250 ms) para não consultar o banco a cada tecla de quem
  digita rápido. Enter também busca na hora.

  router.replace roda dentro de uma "transição" do React: enquanto o
  resultado novo não chega, a lista antiga continua na tela (sem piscar o
  "carregando") e o campo não perde o foco.

  Os outros filtros da URL (categoria, status, ordem) são mantidos.
*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const ESPERA_MS = 250;

export function FormBusca({
  action,
  valor = "",
  placeholder,
}: {
  /** página da lista, ex.: "/servicos" */
  action: string;
  valor?: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(valor);
  const [carregando, iniciarTransicao] = useTransition();
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Limpa o timer se a pessoa sair da página no meio da espera
  useEffect(() => () => clearTimeout(espera.current), []);

  function aplicar(novo: string) {
    clearTimeout(espera.current);
    // Lê a URL ATUAL (e não a de quando a página carregou): assim mantém
    // categoria, status e ordem que a pessoa tenha escolhido depois
    const parametros = new URLSearchParams(window.location.search);
    if (novo.trim()) parametros.set("busca", novo.trim());
    else parametros.delete("busca");
    const qs = parametros.toString();
    iniciarTransicao(() => {
      // replace (e não push): digitar não enche o histórico do "voltar"
      router.replace(qs ? `${action}?${qs}` : action, { scroll: false });
    });
  }

  function aoDigitar(novo: string) {
    setTexto(novo);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => aplicar(novo), ESPERA_MS);
  }

  return (
    <form
      role="search"
      className="mb-4 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault(); // Enter: busca na hora, sem recarregar
        aplicar(texto);
      }}
    >
      <label htmlFor="busca" className="sr-only">
        Buscar
      </label>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <input
          id="busca"
          name="busca"
          type="search"
          value={texto}
          onChange={(e) => aoDigitar(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
        />
        {/* Indicador discreto enquanto o resultado novo chega */}
        {carregando && (
          <span
            aria-label="Buscando"
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500"
          />
        )}
      </div>
      {texto && (
        <Link
          href={action}
          onClick={(e) => {
            e.preventDefault();
            setTexto("");
            aplicar("");
          }}
          className="text-sm text-slate-600 underline"
        >
          Limpar
        </Link>
      )}
    </form>
  );
}
