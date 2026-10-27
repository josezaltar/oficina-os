import { describe, expect, it } from "vitest";
import {
  centavosParaCampo,
  formatarMoeda,
  formatarPlaca,
  lerMoedaEmCentavos,
  lerNumeroBr,
  normalizarPlaca,
} from "./formato";

// O Intl usa um espaço especial (não quebrável) depois do "R$".
// Trocamos por espaço comum para o teste ficar legível.
const semEspacoEspecial = (texto: string) => texto.replace(/\s/g, " ");

describe("dinheiro", () => {
  it("formata centavos em reais", () => {
    expect(semEspacoEspecial(formatarMoeda(123450))).toBe("R$ 1.234,50");
    expect(semEspacoEspecial(formatarMoeda(0))).toBe("R$ 0,00");
  });

  it("lê valores digitados no padrão brasileiro", () => {
    expect(lerMoedaEmCentavos("1.234,56")).toBe(123456);
    expect(lerMoedaEmCentavos("45,9")).toBe(4590);
    expect(lerMoedaEmCentavos("250")).toBe(25000);
    expect(lerMoedaEmCentavos("R$ 10,00")).toBe(1000);
  });

  it("aceita ponto decimal quando não há vírgula", () => {
    expect(lerMoedaEmCentavos("45.90")).toBe(4590);
  });

  it("devolve NaN para texto inválido", () => {
    expect(lerMoedaEmCentavos("")).toBeNaN();
    expect(lerMoedaEmCentavos("abc")).toBeNaN();
    expect(lerMoedaEmCentavos("1,2,3")).toBeNaN();
  });

  it("converte centavos para o formato do campo", () => {
    expect(centavosParaCampo(123456)).toBe("1.234,56");
    expect(centavosParaCampo(4590)).toBe("45,90");
  });

  it("ida e volta: campo → centavos → campo não perde valor", () => {
    expect(centavosParaCampo(lerMoedaEmCentavos("9.876,54"))).toBe("9.876,54");
  });
});

describe("números", () => {
  it("lê quantidade com vírgula", () => {
    expect(lerNumeroBr("2,5")).toBe(2.5);
    expect(lerNumeroBr("10")).toBe(10);
  });
});

describe("placa", () => {
  it("normaliza: tira hífen e espaço, põe em maiúsculas", () => {
    expect(normalizarPlaca("abc-1d23")).toBe("ABC1D23");
    expect(normalizarPlaca(" abc 1234 ")).toBe("ABC1234");
  });

  it("formata para exibição com hífen", () => {
    expect(formatarPlaca("ABC1D23")).toBe("ABC-1D23");
  });
});
