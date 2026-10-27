"use client";
/*
  Campos Marca, Modelo e Ano com sugestões do catálogo.

  Usa <datalist>, do próprio HTML: o campo continua livre para digitar,
  mas mostra a lista do que já foi cadastrado, filtrando enquanto a pessoa
  digita. Funciona no computador e no celular, sem biblioteca nenhuma.

  As sugestões são encadeadas:
  - Marca: todas as marcas já usadas;
  - Modelo: só os modelos da marca digitada;
  - Ano: só os anos daquele marca + modelo.
  Por isso é Client Component: as listas mudam conforme a digitação (useState).
*/
import { useState } from "react";
import { Campo } from "./ui";

export type ItemCatalogo = { marca: string; modelo: string; ano: number | null };

/** Remove repetidos sem diferenciar maiúsculas ("Scania" = "SCANIA"). */
function semRepetir(lista: string[]) {
  const vistos = new Map<string, string>();
  for (const item of lista) {
    const chave = item.toLowerCase();
    if (!vistos.has(chave)) vistos.set(chave, item);
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function CamposMarcaModelo({
  catalogo,
  inicial,
  erros,
}: {
  catalogo: ItemCatalogo[];
  inicial: { marca?: string; modelo?: string; ano?: string };
  erros: Record<string, string[] | undefined>;
}) {
  const [marca, setMarca] = useState(inicial.marca ?? "");
  const [modelo, setModelo] = useState(inicial.modelo ?? "");
  const [ano, setAno] = useState(inicial.ano ?? "");

  const marcas = semRepetir(catalogo.map((c) => c.marca));

  // Com marca digitada, só os modelos dela; sem marca, todos
  const daMarca = marca.trim() ? catalogo.filter((c) => igual(c.marca, marca)) : catalogo;
  const modelos = semRepetir(daMarca.map((c) => c.modelo));

  const anos = [
    ...new Set(
      daMarca
        .filter((c) => !modelo.trim() || igual(c.modelo, modelo))
        .map((c) => c.ano)
        .filter((a): a is number => a !== null),
    ),
  ].sort((a, b) => b - a); // mais novos primeiro

  return (
    <>
      <Campo
        rotulo="Marca *"
        name="marca"
        list="sugestoes-marca"
        value={marca}
        onChange={(e) => setMarca(e.target.value)}
        erros={erros.marca}
        placeholder="Scania"
        autoComplete="off"
        dica={marcas.length ? "Escolha da lista ou digite uma nova." : undefined}
      />
      <datalist id="sugestoes-marca">
        {marcas.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <Campo
        rotulo="Modelo *"
        name="modelo"
        list="sugestoes-modelo"
        value={modelo}
        onChange={(e) => setModelo(e.target.value)}
        erros={erros.modelo}
        placeholder="R 450"
        autoComplete="off"
      />
      <datalist id="sugestoes-modelo">
        {modelos.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <Campo
        rotulo="Ano"
        name="ano"
        list="sugestoes-ano"
        inputMode="numeric"
        value={ano}
        onChange={(e) => setAno(e.target.value)}
        erros={erros.ano}
        placeholder="2020"
        autoComplete="off"
      />
      <datalist id="sugestoes-ano">
        {anos.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
    </>
  );
}
