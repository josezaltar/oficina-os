"use client";
// Formulário de serviço (novo e editar). Mesmo padrão do form-cliente.tsx.
import Link from "next/link";
import { useActionState } from "react";
import { estadoInicial, type EstadoForm } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { Aviso, Campo, classeBotao } from "./ui";

export function FormServico({
  acao,
  inicial = {},
  categorias,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial?: Record<string, string>;
  /** categorias já usadas, para sugestão */
  categorias: string[];
}) {
  const [estado, acaoForm] = useActionState(acao, estadoInicial);
  const v = estado.valores ?? inicial;
  const e = estado.erros ?? {};

  return (
    <form
      key={JSON.stringify(estado.valores ?? {})}
      action={acaoForm}
      className="grid max-w-2xl gap-4 sm:grid-cols-4"
      noValidate
    >
      <div className="sm:col-span-1">
        <Campo rotulo="Código" name="referencia" defaultValue={v.referencia} erros={e.referencia} autoComplete="off" />
      </div>
      <div className="sm:col-span-3">
        <Campo
          rotulo="Descrição *"
          name="descricao"
          defaultValue={v.descricao}
          erros={e.descricao}
          placeholder="Ex.: TROCAR OLEO E FILTRO DO MOTOR"
          autoComplete="off"
        />
      </div>
      <div className="sm:col-span-2">
        <Campo
          rotulo="Preço (R$)"
          name="preco"
          inputMode="decimal"
          defaultValue={v.preco}
          erros={e.preco}
          placeholder="0,00"
          dica="Deixe em branco se o preço varia a cada OS."
        />
      </div>
      <div className="sm:col-span-2">
        <Campo
          rotulo="Categoria"
          name="categoria"
          list="sugestoes-categoria"
          defaultValue={v.categoria}
          erros={e.categoria}
          placeholder="Ex.: MOTOR"
          autoComplete="off"
        />
        <datalist id="sugestoes-categoria">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <BotaoEnviar>Salvar serviço</BotaoEnviar>
        <Link href="/servicos" className={classeBotao.secundario}>
          Cancelar
        </Link>
        <Aviso mensagem={estado.mensagem} sucesso={estado.sucesso} />
      </div>
    </form>
  );
}
