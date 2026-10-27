import { BotaoEnviar } from "./botao-enviar";
import { EtiquetaVencimento } from "./ui";

/*
  Cartão "Pagamento" da OS (Server Component com forms de Server Action).
  - Ainda não pagou: mostra o prazo e permite definir o vencimento e
    registrar o pagamento (hoje ou outro dia).
  - Já pagou: mostra o dia e permite desfazer, se foi engano.
*/
export function ControlePagamento({
  hoje,
  vencimento,
  pagaEm,
  definirVencimento,
  marcarPaga,
  desfazer,
}: {
  hoje: string;
  vencimento: string | null;
  pagaEm: string | null;
  definirVencimento: (formData: FormData) => Promise<void>;
  marcarPaga: (formData: FormData) => Promise<void>;
  desfazer: () => Promise<void>;
}) {
  const classeData =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none";

  if (pagaEm) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <EtiquetaVencimento hoje={hoje} vencimento={vencimento} pagaEm={pagaEm} />
        <form action={desfazer}>
          <BotaoEnviar variante="secundario" enviando="...">
            Desfazer pagamento
          </BotaoEnviar>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        A receber · <EtiquetaVencimento hoje={hoje} vencimento={vencimento} pagaEm={null} />
      </p>
      <div className="flex flex-wrap items-end gap-6">
        <form action={definirVencimento} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="block font-medium text-slate-700">Vencimento</span>
            <input
              type="date"
              name="pagamentoVencimento"
              defaultValue={vencimento ?? ""}
              aria-label="Vencimento do pagamento"
              className={`mt-1 ${classeData}`}
            />
          </label>
          <BotaoEnviar variante="secundario" enviando="Salvando...">
            Salvar vencimento
          </BotaoEnviar>
        </form>
        <form action={marcarPaga} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="block font-medium text-slate-700">Pago em</span>
            <input
              type="date"
              name="pagaEm"
              defaultValue={hoje}
              aria-label="Dia do pagamento"
              className={`mt-1 ${classeData}`}
            />
          </label>
          <BotaoEnviar enviando="Registrando...">Registrar pagamento</BotaoEnviar>
        </form>
      </div>
    </div>
  );
}
