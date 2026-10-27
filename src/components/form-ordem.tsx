"use client";
import Link from "next/link";
import { useActionState } from "react";
import { estadoInicial, type EstadoForm } from "@/lib/estado-form";
import { formatarPlaca } from "@/lib/formato";
import { BotaoEnviar } from "./botao-enviar";
import { AreaTexto, Aviso, Campo, Selecao, classeBotao } from "./ui";

type OpcaoVeiculo = {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  clienteNome: string;
};

/** Formulário de abertura de OS. Os itens são lançados depois, na página da OS. */
export function FormOrdem({
  acao,
  veiculos,
  veiculoId = "",
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  veiculos: OpcaoVeiculo[];
  veiculoId?: string;
}) {
  const [estado, acaoForm] = useActionState(acao, estadoInicial);
  const v = estado.valores ?? { veiculoId };
  const e = estado.erros ?? {};

  return (
    <form
      key={JSON.stringify(estado.valores ?? {})}
      action={acaoForm}
      className="grid max-w-2xl gap-4 sm:grid-cols-2"
      noValidate
    >
      <div className="sm:col-span-2">
        <Selecao rotulo="Veículo *" name="veiculoId" defaultValue={v.veiculoId} erros={e.veiculoId}>
          <option value="">Selecione...</option>
          {veiculos.map((ve) => (
            <option key={ve.id} value={ve.id}>
              {formatarPlaca(ve.placa)} · {ve.marca} {ve.modelo} · {ve.clienteNome}
            </option>
          ))}
        </Selecao>
      </div>
      <div className="sm:col-span-2">
        <AreaTexto
          rotulo="Problema relatado pelo cliente *"
          name="descricaoProblema"
          defaultValue={v.descricaoProblema}
          erros={e.descricaoProblema}
        />
      </div>
      <Campo
        rotulo="Km na entrada"
        name="kmEntrada"
        inputMode="numeric"
        defaultValue={v.kmEntrada}
        erros={e.kmEntrada}
        placeholder="250000"
      />
      <div className="sm:col-span-2">
        <AreaTexto rotulo="Observações internas" name="observacoes" defaultValue={v.observacoes} erros={e.observacoes} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <BotaoEnviar enviando="Abrindo...">Abrir ordem de serviço</BotaoEnviar>
        <Link href="/ordens" className={classeBotao.secundario}>
          Cancelar
        </Link>
        <Aviso mensagem={estado.mensagem} />
      </div>
    </form>
  );
}
