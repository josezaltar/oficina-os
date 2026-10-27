"use client";
// Formulário de conta a pagar (nova e editar). Mesmo padrão dos outros formulários.
import Link from "next/link";
import { useActionState } from "react";
import { estadoInicial, type EstadoForm } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { AreaTexto, Aviso, Campo, classeBotao } from "./ui";

export function FormConta({
  acao,
  inicial = {},
  sugestoes,
  editando = false,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial?: Record<string, string>;
  sugestoes: { fornecedores: string[]; categorias: string[] };
  editando?: boolean;
}) {
  const [estado, acaoForm] = useActionState(acao, estadoInicial);
  const v = estado.valores ?? inicial;
  const e = estado.erros ?? {};

  return (
    <form
      key={JSON.stringify(estado.valores ?? {})}
      action={acaoForm}
      className="grid max-w-2xl gap-4 sm:grid-cols-2"
      noValidate
    >
      <div className="sm:col-span-2">
        <Campo
          rotulo="Descrição *"
          name="descricao"
          defaultValue={v.descricao}
          erros={e.descricao}
          placeholder="Ex.: Nota de peças nº 1234, Conta de luz"
          autoComplete="off"
        />
      </div>
      <Campo
        rotulo="Fornecedor"
        name="fornecedor"
        list="sugestoes-fornecedor"
        defaultValue={v.fornecedor}
        erros={e.fornecedor}
        placeholder="Ex.: Cemig, Distribuidora X"
        autoComplete="off"
      />
      <datalist id="sugestoes-fornecedor">
        {sugestoes.fornecedores.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <Campo
        rotulo="Categoria"
        name="categoria"
        list="sugestoes-categoria-conta"
        defaultValue={v.categoria}
        erros={e.categoria}
        placeholder="Ex.: LUZ"
        autoComplete="off"
      />
      <datalist id="sugestoes-categoria-conta">
        {sugestoes.categorias.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Campo
        rotulo="Valor (R$) *"
        name="valor"
        inputMode="decimal"
        defaultValue={v.valor}
        erros={e.valor}
        placeholder="0,00"
      />
      <Campo rotulo="Vencimento *" name="vencimento" type="date" defaultValue={v.vencimento} erros={e.vencimento} />
      {editando && (
        <Campo
          rotulo="Paga em"
          name="pagaEm"
          type="date"
          defaultValue={v.pagaEm}
          erros={e.pagaEm}
          dica="Deixe em branco se ainda não foi paga."
        />
      )}
      <div className="sm:col-span-2">
        <AreaTexto rotulo="Observações" name="observacoes" defaultValue={v.observacoes} erros={e.observacoes} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <BotaoEnviar>Salvar conta</BotaoEnviar>
        <Link href="/contas" className={classeBotao.secundario}>
          Cancelar
        </Link>
        <Aviso mensagem={estado.mensagem} sucesso={estado.sucesso} />
      </div>
    </form>
  );
}
