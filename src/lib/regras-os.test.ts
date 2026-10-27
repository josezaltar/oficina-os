/*
  Testes das regras da OS (etapa 9).
  Rode com: npm test

  Estrutura de cada teste: "describe" agrupa, "it" descreve UM
  comportamento esperado, e "expect" confere o resultado.
*/
import { describe, expect, it } from "vitest";
import {
  calcularTotalCentavos,
  podeEditarItens,
  podeExcluirOs,
  podeMudarStatus,
  statusPermitidos,
  subtotalCentavos,
} from "./regras-os";

describe("total da OS", () => {
  it("soma quantidade × valor de cada item", () => {
    const itens = [
      { quantidade: 1, valorUnitarioCentavos: 25000 }, // R$ 250,00
      { quantidade: 2.5, valorUnitarioCentavos: 4590 }, // 2,5 × R$ 45,90 = R$ 114,75
    ];
    expect(calcularTotalCentavos(itens)).toBe(36475);
  });

  it("é zero quando a OS não tem itens", () => {
    expect(calcularTotalCentavos([])).toBe(0);
  });

  it("arredonda o subtotal para o centavo mais próximo", () => {
    // 0,333 × R$ 10,00 = R$ 3,33 (não 3,3333...)
    expect(subtotalCentavos({ quantidade: 0.333, valorUnitarioCentavos: 1000 })).toBe(333);
    // 1,5 × R$ 0,01 = 1,5 centavo → arredonda para 2
    expect(subtotalCentavos({ quantidade: 1.5, valorUnitarioCentavos: 1 })).toBe(2);
  });

  it("não sofre com erro de ponto flutuante (por isso usamos centavos)", () => {
    // Em reais: 0.1 + 0.2 = 0.30000000000000004. Em centavos: 10 + 20 = 30.
    const itens = [
      { quantidade: 1, valorUnitarioCentavos: 10 },
      { quantidade: 1, valorUnitarioCentavos: 20 },
    ];
    expect(calcularTotalCentavos(itens)).toBe(30);
  });
});

describe("mudança de status", () => {
  it("segue o fluxo Aberta → Em andamento → Pronta → Entregue", () => {
    expect(podeMudarStatus("aberta", "em_andamento")).toBe(true);
    expect(podeMudarStatus("em_andamento", "pronta")).toBe(true);
    expect(podeMudarStatus("pronta", "entregue")).toBe(true);
  });

  it("não deixa pular etapas", () => {
    expect(podeMudarStatus("aberta", "pronta")).toBe(false);
    expect(podeMudarStatus("aberta", "entregue")).toBe(false);
    expect(podeMudarStatus("em_andamento", "entregue")).toBe(false);
  });

  it("permite voltar uma etapa", () => {
    expect(podeMudarStatus("em_andamento", "aberta")).toBe(true);
    expect(podeMudarStatus("pronta", "em_andamento")).toBe(true);
  });

  it("não deixa voltar duas etapas", () => {
    expect(podeMudarStatus("pronta", "aberta")).toBe(false);
  });

  it("trata Entregue como final", () => {
    expect(statusPermitidos("entregue")).toEqual([]);
    expect(podeMudarStatus("entregue", "pronta")).toBe(false);
  });

  it("não aceita 'mudar' para o mesmo status", () => {
    expect(podeMudarStatus("aberta", "aberta")).toBe(false);
  });

  it("lista os próximos passos possíveis", () => {
    expect(statusPermitidos("aberta")).toEqual(["em_andamento"]);
    expect(statusPermitidos("em_andamento")).toEqual(["aberta", "pronta"]);
  });
});

describe("edição e exclusão", () => {
  it("só deixa editar itens enquanto o serviço não terminou", () => {
    expect(podeEditarItens("aberta")).toBe(true);
    expect(podeEditarItens("em_andamento")).toBe(true);
    expect(podeEditarItens("pronta")).toBe(false);
    expect(podeEditarItens("entregue")).toBe(false);
  });

  it("protege OS entregue contra exclusão", () => {
    expect(podeExcluirOs("aberta")).toBe(true);
    expect(podeExcluirOs("entregue")).toBe(false);
  });
});
