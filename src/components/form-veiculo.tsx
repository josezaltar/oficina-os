"use client";
// Mesmo padrão do form-cliente.tsx (useActionState + erros por campo).
import Link from "next/link";
import { useActionState } from "react";
import { estadoInicial, type EstadoForm } from "@/lib/estado-form";
import { BotaoEnviar } from "./botao-enviar";
import { CamposMarcaModelo, type ItemCatalogo } from "./campos-marca-modelo";
import { Aviso, Campo, Selecao, classeBotao } from "./ui";

type Props = {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  clientes: { id: number; nome: string }[];
  /** marcas/modelos/anos já cadastrados, para as sugestões */
  catalogo: ItemCatalogo[];
  inicial?: Record<string, string>;
  voltarPara: string;
};

export function FormVeiculo({ acao, clientes, catalogo, inicial = {}, voltarPara }: Props) {
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
        <Selecao rotulo="Cliente (dono) *" name="clienteId" defaultValue={v.clienteId ?? ""} erros={e.clienteId}>
          <option value="">Selecione...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Selecao>
      </div>
      <Campo
        rotulo="Placa *"
        name="placa"
        defaultValue={v.placa}
        erros={e.placa}
        placeholder="ABC1D23"
        dica="Antiga (ABC1234) ou Mercosul (ABC1D23). O hífen é opcional."
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none aria-invalid:border-red-500"
        autoComplete="off"
      />
      <CamposMarcaModelo
        catalogo={catalogo}
        inicial={{ marca: v.marca, modelo: v.modelo, ano: v.ano }}
        erros={e}
      />

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <BotaoEnviar>Salvar veículo</BotaoEnviar>
        <Link href={voltarPara} className={classeBotao.secundario}>
          Cancelar
        </Link>
        <Aviso mensagem={estado.mensagem} sucesso={estado.sucesso} />
      </div>
    </form>
  );
}
