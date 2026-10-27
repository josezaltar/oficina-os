import { describe, expect, it } from "vitest";
import {
  dataBr,
  diasAte,
  limitesDoMes,
  precisaAlerta,
  situacaoVencimento,
  somarMeses,
  textoVencimento,
} from "./financeiro";

const HOJE = "2026-10-27";

describe("dias até o vencimento", () => {
  it("conta dias corridos, inclusive virando o mês", () => {
    expect(diasAte(HOJE, "2026-10-29")).toBe(2);
    expect(diasAte(HOJE, "2026-11-01")).toBe(5);
    expect(diasAte(HOJE, "2026-10-25")).toBe(-2);
    expect(diasAte(HOJE, HOJE)).toBe(0);
  });
});

describe("situação e alerta (2 dias antes)", () => {
  it("avisa de 2 dias antes até depois de vencida", () => {
    expect(situacaoVencimento(HOJE, "2026-10-30", null)).toBe("em_dia"); // 3 dias: ainda não
    expect(situacaoVencimento(HOJE, "2026-10-29", null)).toBe("vence_logo"); // 2 dias: avisa
    expect(situacaoVencimento(HOJE, "2026-10-28", null)).toBe("vence_logo");
    expect(situacaoVencimento(HOJE, HOJE, null)).toBe("vence_hoje");
    expect(situacaoVencimento(HOJE, "2026-10-20", null)).toBe("vencida");
  });

  it("conta paga sai do alerta, mesmo vencida", () => {
    const situacao = situacaoVencimento(HOJE, "2026-10-20", "2026-10-21");
    expect(situacao).toBe("paga");
    expect(precisaAlerta(situacao)).toBe(false);
  });

  it("só alerta vencida, vence hoje ou vence logo", () => {
    expect(precisaAlerta("vencida")).toBe(true);
    expect(precisaAlerta("vence_hoje")).toBe(true);
    expect(precisaAlerta("vence_logo")).toBe(true);
    expect(precisaAlerta("em_dia")).toBe(false);
    expect(precisaAlerta("sem_data")).toBe(false);
  });

  it("escreve o prazo em português", () => {
    expect(textoVencimento(HOJE, "2026-10-28", null)).toBe("Vence amanhã");
    expect(textoVencimento(HOJE, "2026-10-29", null)).toBe("Vence em 2 dias");
    expect(textoVencimento(HOJE, "2026-10-26", null)).toBe("Venceu ontem");
    expect(textoVencimento(HOJE, "2026-10-20", null)).toBe("Vencida há 7 dias");
    expect(textoVencimento(HOJE, "2026-11-15", null)).toBe("Vence 15/11/2026");
    expect(textoVencimento(HOJE, "2026-10-20", "2026-10-21")).toBe("Paga em 21/10/2026");
  });
});

describe("datas e meses", () => {
  it("formata data sem fuso", () => {
    expect(dataBr("2026-01-05")).toBe("05/01/2026");
  });

  it("acha o primeiro e o último dia do mês (inclusive fevereiro bissexto)", () => {
    expect(limitesDoMes("2026-10")).toEqual(["2026-10-01", "2026-10-31"]);
    expect(limitesDoMes("2028-02")).toEqual(["2028-02-01", "2028-02-29"]);
  });

  it("anda meses para frente e para trás, virando o ano", () => {
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
  });
});
