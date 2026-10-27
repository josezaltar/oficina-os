"use client";
/*
  Nova OS no formato do bloco de papel da oficina.

  Cabeçalho (placa, data, nome, telefone, cidade, CEP, nº, marca, modelo,
  tipo) e itens (Unid., Descrição, Preço Unit., Total) num formulário só.

  A placa vem primeiro porque é ela que decide o resto:
  - placa conhecida → o sistema busca no servidor e preenche o bloco com o
    cadastro daquele veículo e cliente. O que for alterado vale só para
    esta OS (o cadastro não muda);
  - placa nova → ao salvar, o cliente e o veículo são cadastrados com os
    dados do bloco.

  Todos os campos são "controlados" (useState): é isso que permite
  preencher sozinho depois da busca, e manter o que foi digitado se o
  servidor devolver algum erro.
*/
import Link from "next/link";
import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import type { DadosDaPlaca, ClienteSugestao } from "@/lib/dados/bloco";
import type { EstadoForm } from "@/lib/estado-form";
import { normalizarPlaca } from "@/lib/formato";
import { BotaoEnviar } from "./botao-enviar";
import { igual, semRepetir, type ItemCatalogo } from "./campos-marca-modelo";
import { LinhasItens } from "./linhas-itens";
import { Aviso, classeBotao } from "./ui";

type Campos = {
  placa: string;
  data: string;
  nome: string;
  telefone: string;
  cidade: string;
  cep: string;
  numero: string;
  marca: string;
  modelo: string;
  tipo: string;
};

type SituacaoPlaca =
  | { tipo: "vazia" }
  | { tipo: "buscando" }
  | { tipo: "conhecida"; veiculoId: number; clienteId: number }
  | { tipo: "nova" };

const REGEX_PLACA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

/** Converte o que veio do banco para os campos do bloco. */
function camposDoCadastro(d: DadosDaPlaca): Partial<Campos> {
  return {
    nome: d.nome,
    telefone: d.telefone,
    cidade: d.cidade ?? "",
    cep: d.cep ?? "",
    numero: d.numero ?? "",
    marca: d.marca,
    modelo: d.modelo,
    tipo: d.tipo ?? "",
  };
}

const CAMPOS_DO_CADASTRO = [
  "nome",
  "telefone",
  "cidade",
  "cep",
  "numero",
  "marca",
  "modelo",
  "tipo",
] as const;

export function FormOrdem({
  acao,
  consultarPlaca,
  hoje,
  inicial,
  sugestoes,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  consultarPlaca: (placa: string) => Promise<DadosDaPlaca | null>;
  hoje: string;
  /** veio de "Abrir OS" na página de um veículo: o bloco já começa preenchido */
  inicial?: DadosDaPlaca & { placa: string };
  sugestoes: {
    clientes: ClienteSugestao[];
    cidades: string[];
    tipos: string[];
    catalogo: ItemCatalogo[];
    servicos: string[];
  };
}) {
  const [estado, acaoForm] = useActionState(acao, {});

  /*
    Erros que vieram do servidor somem do campo assim que ele é corrigido.
    Quando chega uma resposta nova do servidor, todos voltam a valer.
    (Comparar com o "estado visto" durante a renderização é o jeito que o
    React recomenda para reagir a uma mudança de props/estado sem useEffect.)
  */
  const [corrigidos, setCorrigidos] = useState<string[]>([]);
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estado !== estadoVisto) {
    setEstadoVisto(estado);
    setCorrigidos([]);
  }
  const e = Object.fromEntries(
    Object.entries(estado.erros ?? {}).filter(([campo]) => !corrigidos.includes(campo)),
  );
  const nomeDoErro = (campo: keyof Campos) => (campo === "tipo" ? "tipoVeiculo" : campo);
  const marcarCorrigidos = (lista: readonly (keyof Campos)[]) =>
    setCorrigidos((atual) => [...atual, ...lista.map(nomeDoErro)]);

  const [campos, setCampos] = useState<Campos>({
    placa: inicial?.placa ?? "",
    data: hoje,
    nome: "",
    telefone: "",
    cidade: "",
    cep: "",
    numero: "",
    marca: "",
    modelo: "",
    tipo: "",
    ...(inicial ? camposDoCadastro(inicial) : {}),
  });
  const [situacao, setSituacao] = useState<SituacaoPlaca>(
    inicial
      ? { tipo: "conhecida", veiculoId: inicial.veiculoId, clienteId: inicial.clienteId }
      : { tipo: "vazia" },
  );
  // Cliente já cadastrado reconhecido pelo nome (placa nova de um cliente antigo)
  const [clienteReconhecido, setClienteReconhecido] = useState<ClienteSugestao | null>(null);

  const [, iniciarBusca] = useTransition();
  const ultimaPlacaBuscada = useRef(inicial?.placa ?? "");
  // Os campos do bloco foram preenchidos pelo cadastro de uma placa conhecida?
  const preenchidoPeloCadastro = useRef(Boolean(inicial));

  const alterar = (campo: keyof Campos, valor: string) => {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
    marcarCorrigidos([campo]);
  };

  /* ----------------------------------------------------- busca pela placa */
  function buscarPlaca(texto: string) {
    const placa = normalizarPlaca(texto);
    if (!REGEX_PLACA.test(placa)) {
      setSituacao({ tipo: "vazia" });
      return;
    }
    if (placa === ultimaPlacaBuscada.current) return; // já buscada
    ultimaPlacaBuscada.current = placa;
    setSituacao({ tipo: "buscando" });

    iniciarBusca(async () => {
      // A Server Action roda no servidor e devolve os dados (ou null)
      const dados = await consultarPlaca(placa);
      // Se a pessoa já digitou outra placa enquanto esperava, ignora esta resposta
      if (ultimaPlacaBuscada.current !== placa) return;

      if (dados) {
        setCampos((atual) => ({ ...atual, ...camposDoCadastro(dados) }));
        marcarCorrigidos(CAMPOS_DO_CADASTRO);
        setSituacao({ tipo: "conhecida", veiculoId: dados.veiculoId, clienteId: dados.clienteId });
        setClienteReconhecido(null);
        preenchidoPeloCadastro.current = true;
      } else {
        // Trocou de uma placa conhecida para uma nova: limpa o que foi
        // preenchido sozinho, para não abrir a OS com o dono errado
        if (preenchidoPeloCadastro.current) {
          setCampos((atual) => {
            const limpo = { ...atual };
            for (const c of CAMPOS_DO_CADASTRO) limpo[c] = "";
            return limpo;
          });
          preenchidoPeloCadastro.current = false;
        }
        setSituacao({ tipo: "nova" });
      }
    });
  }

  /* ------------------------------------- nome de cliente que já existe */
  function alterarNome(nome: string) {
    alterar("nome", nome);
    if (situacao.tipo === "conhecida") return; // o dono já veio da placa
    const cliente = sugestoes.clientes.find((c) => igual(c.nome, nome)) ?? null;
    setClienteReconhecido(cliente);
    if (cliente) {
      // Preenche só o que ainda está vazio: não apaga o que foi digitado
      setCampos((atual) => ({
        ...atual,
        nome: cliente.nome, // adota a grafia do cadastro ("joão" → "João")
        telefone: atual.telefone || cliente.telefone,
        cidade: atual.cidade || (cliente.cidade ?? ""),
        cep: atual.cep || (cliente.cep ?? ""),
        numero: atual.numero || (cliente.numero ?? ""),
      }));
    }
  }

  /* ------------------------------------------------ listas de sugestões */
  const marcas = semRepetir(sugestoes.catalogo.map((c) => c.marca));
  const daMarca = campos.marca.trim()
    ? sugestoes.catalogo.filter((c) => igual(c.marca, campos.marca))
    : sugestoes.catalogo;
  const modelos = semRepetir(daMarca.map((c) => c.modelo));

  return (
    <form action={acaoForm} noValidate className="space-y-6">
      {/* ------------------------------------------- cabeçalho do bloco */}
      <div className="overflow-hidden rounded-lg border-2 border-slate-700 bg-white">
        <Linha>
          <Celula rotulo="Placa *" id="placa" erros={e.placa} className="sm:col-span-2">
            <input
              id="placa"
              name="placa"
              value={campos.placa}
              onChange={(ev) => {
                alterar("placa", ev.target.value);
                // Busca sozinho quando a placa fica completa (7 caracteres)
                if (normalizarPlaca(ev.target.value).length === 7) buscarPlaca(ev.target.value);
              }}
              onBlur={(ev) => buscarPlaca(ev.target.value)}
              placeholder="ABC1D23"
              autoComplete="off"
              autoFocus={!inicial}
              aria-invalid={e.placa ? true : undefined}
              aria-describedby="placa-situacao"
              className={`${classeEntrada} font-mono text-lg uppercase`}
            />
            <SituacaoDaPlaca situacao={situacao} />
          </Celula>
          <Celula rotulo="Data *" id="data" erros={e.data}>
            <input
              id="data"
              name="data"
              type="date"
              value={campos.data}
              onChange={(ev) => alterar("data", ev.target.value)}
              className={classeEntrada}
            />
          </Celula>
        </Linha>

        <Linha>
          <Celula rotulo="Nome *" id="nome" erros={e.nome} className="sm:col-span-2">
            <input
              id="nome"
              name="nome"
              list="sugestoes-cliente"
              value={campos.nome}
              onChange={(ev) => alterarNome(ev.target.value)}
              autoComplete="off"
              aria-invalid={e.nome ? true : undefined}
              className={classeEntrada}
            />
            <datalist id="sugestoes-cliente">
              {sugestoes.clientes.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
            {clienteReconhecido && situacao.tipo !== "conhecida" && (
              <p className="mt-1 text-xs text-sky-700">
                Cliente já cadastrado: o veículo será adicionado a ele.
              </p>
            )}
          </Celula>
          <Celula rotulo="Tel *" id="telefone" erros={e.telefone}>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              value={campos.telefone}
              onChange={(ev) => alterar("telefone", ev.target.value)}
              placeholder="(37) 99999-0000"
              aria-invalid={e.telefone ? true : undefined}
              className={classeEntrada}
            />
          </Celula>
        </Linha>

        <Linha>
          <Celula rotulo="Cidade" id="cidade" erros={e.cidade}>
            <input
              id="cidade"
              name="cidade"
              list="sugestoes-cidade"
              value={campos.cidade}
              onChange={(ev) => alterar("cidade", ev.target.value)}
              autoComplete="off"
              className={classeEntrada}
            />
            <datalist id="sugestoes-cidade">
              {sugestoes.cidades.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Celula>
          <Celula rotulo="CEP" id="cep" erros={e.cep}>
            <input
              id="cep"
              name="cep"
              inputMode="numeric"
              value={campos.cep}
              onChange={(ev) => alterar("cep", ev.target.value)}
              placeholder="35500-000"
              aria-invalid={e.cep ? true : undefined}
              className={classeEntrada}
            />
          </Celula>
          <Celula rotulo="Nº" id="numero" erros={e.numero}>
            <input
              id="numero"
              name="numero"
              value={campos.numero}
              onChange={(ev) => alterar("numero", ev.target.value)}
              className={classeEntrada}
            />
          </Celula>
        </Linha>

        <Linha ultima>
          <Celula rotulo="Marca *" id="marca" erros={e.marca}>
            <input
              id="marca"
              name="marca"
              list="sugestoes-marca"
              value={campos.marca}
              onChange={(ev) => alterar("marca", ev.target.value)}
              autoComplete="off"
              aria-invalid={e.marca ? true : undefined}
              className={classeEntrada}
            />
            <datalist id="sugestoes-marca">
              {marcas.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Celula>
          <Celula rotulo="Modelo *" id="modelo" erros={e.modelo}>
            <input
              id="modelo"
              name="modelo"
              list="sugestoes-modelo"
              value={campos.modelo}
              onChange={(ev) => alterar("modelo", ev.target.value)}
              autoComplete="off"
              aria-invalid={e.modelo ? true : undefined}
              className={classeEntrada}
            />
            <datalist id="sugestoes-modelo">
              {modelos.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Celula>
          <Celula rotulo="Tipo" id="tipoVeiculo" erros={e.tipoVeiculo}>
            {/* name "tipoVeiculo" e não "tipo": cada linha de item já manda um
                campo "tipo" (peça/serviço), e os dois se misturariam */}
            <input
              id="tipoVeiculo"
              name="tipoVeiculo"
              list="sugestoes-tipo"
              value={campos.tipo}
              onChange={(ev) => alterar("tipo", ev.target.value)}
              placeholder="Ex.: Cavalo mecânico"
              autoComplete="off"
              className={classeEntrada}
            />
            <datalist id="sugestoes-tipo">
              {sugestoes.tipos.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Celula>
        </Linha>
      </div>

      {/* ------------------------------------------- itens do bloco */}
      <LinhasItens linhasVazias={3} erros={e} sugestoes={sugestoes.servicos} />

      <div className="flex flex-wrap items-center gap-3">
        <BotaoEnviar enviando="Abrindo...">Abrir ordem de serviço</BotaoEnviar>
        <Link href="/ordens" className={classeBotao.secundario}>
          Cancelar
        </Link>
        {/* Some quando todos os campos com erro forem corrigidos */}
        <Aviso mensagem={Object.keys(e).length > 0 ? estado.mensagem : undefined} />
      </div>
    </form>
  );
}

/* --------------------------------------------------- peças visuais */

// Campo sem borda própria: a "caixa" é a célula, como no papel
const classeEntrada =
  "mt-0.5 block w-full rounded border-0 bg-transparent px-1 py-1 text-sm text-slate-900 focus:bg-amber-50 focus:ring-2 focus:ring-amber-500/40 focus:outline-none aria-invalid:bg-red-50";

function Linha({ children, ultima = false }: { children: ReactNode; ultima?: boolean }) {
  return (
    <div
      className={`grid grid-cols-1 sm:auto-cols-fr sm:grid-flow-col ${ultima ? "" : "border-b border-slate-400"}`}
    >
      {children}
    </div>
  );
}

function Celula({
  rotulo,
  id,
  erros,
  className = "",
  children,
}: {
  rotulo: string;
  id: string;
  erros?: string[];
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`border-b border-slate-300 px-3 py-2 last:border-b-0 sm:border-r sm:border-b-0 sm:border-slate-400 sm:last:border-r-0 ${className}`}
    >
      <label htmlFor={id} className="block text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
        {rotulo}
      </label>
      {children}
      {erros?.length ? <p className="mt-1 text-xs text-red-600">{erros.join(" ")}</p> : null}
    </div>
  );
}

function SituacaoDaPlaca({ situacao }: { situacao: SituacaoPlaca }) {
  const textos: Record<SituacaoPlaca["tipo"], ReactNode> = {
    vazia: <span className="text-slate-500">Digite a placa: se o veículo já veio antes, os dados aparecem sozinhos.</span>,
    buscando: <span className="text-slate-500">Procurando a placa...</span>,
    conhecida:
      situacao.tipo === "conhecida" ? (
        <span className="text-green-700">
          ✓ Veículo já cadastrado: dados preenchidos. Alterações valem só para esta OS.{" "}
          <Link href={`/veiculos/${situacao.veiculoId}`} className="underline" target="_blank">
            Ver histórico
          </Link>
        </span>
      ) : null,
    nova: (
      <span className="text-amber-700">
        Placa nova: o cliente e o veículo serão cadastrados ao abrir a OS.
      </span>
    ),
  };
  return (
    <p id="placa-situacao" aria-live="polite" className="mt-1 text-xs">
      {textos[situacao.tipo]}
    </p>
  );
}
