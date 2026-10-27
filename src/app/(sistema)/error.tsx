"use client";
// error.tsx PRECISA ser Client Component: ele é uma "error boundary" do React,
// que captura erros que acontecem enquanto a página renderiza.

import { useEffect } from "react";
import { classeBotao } from "@/components/ui";

/*
  Se o banco cair ou uma consulta der erro, em vez da tela inteira quebrar,
  aparece esta mensagem DENTRO do layout (o menu continua funcionando).

  `retry` tenta buscar e renderizar a página de novo. (Nesta versão do Next
  ele substitui o antigo `reset`.)

  Atenção: em produção o Next esconde a mensagem real do erro (`error.message`)
  para não vazar detalhes do servidor. Por isso mostramos um texto genérico.
*/
export default function ErroSistema({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // Em um sistema maior, aqui enviaríamos o erro para um serviço de logs.
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Algo deu errado</h2>
      <p className="mt-1 text-sm text-red-700">
        Não foi possível carregar esta página. Verifique a conexão e tente de novo.
      </p>
      <button onClick={() => retry()} className={`${classeBotao.secundario} mt-4`}>
        Tentar de novo
      </button>
    </div>
  );
}
