import { describe, expect, it } from "vitest";
import { esquemaCliente, esquemaItem, esquemaVeiculo } from "./validacao";

describe("validação de cliente", () => {
  it("aceita cliente válido e transforma campos vazios em null", () => {
    const resultado = esquemaCliente.parse({
      nome: "  Transportes Teste  ",
      telefone: "(37) 99999-0000",
      email: "",
      documento: "",
      observacoes: "",
    });
    expect(resultado).toEqual({
      nome: "Transportes Teste", // trim() tirou os espaços
      telefone: "(37) 99999-0000",
      email: null,
      documento: null,
      observacoes: null,
    });
  });

  it("exige nome e telefone", () => {
    const resultado = esquemaCliente.safeParse({
      nome: " ",
      telefone: "",
      email: "",
      documento: "",
      observacoes: "",
    });
    expect(resultado.success).toBe(false);
    const campos = resultado.error?.issues.map((i) => i.path[0]);
    expect(campos).toContain("nome");
    expect(campos).toContain("telefone");
  });

  it("recusa e-mail inválido", () => {
    const resultado = esquemaCliente.safeParse({
      nome: "Ana",
      telefone: "(37) 99999-0000",
      email: "ana@",
      documento: "",
      observacoes: "",
    });
    expect(resultado.success).toBe(false);
  });
});

describe("validação de veículo", () => {
  const base = { clienteId: "1", marca: "Scania", modelo: "R 450", ano: "" };

  it("aceita placa Mercosul e antiga, com ou sem hífen", () => {
    expect(esquemaVeiculo.parse({ ...base, placa: "abc-1d23" }).placa).toBe("ABC1D23");
    expect(esquemaVeiculo.parse({ ...base, placa: "ABC1234" }).placa).toBe("ABC1234");
  });

  it("recusa placa em formato errado", () => {
    expect(esquemaVeiculo.safeParse({ ...base, placa: "AB1234" }).success).toBe(false);
    expect(esquemaVeiculo.safeParse({ ...base, placa: "1ABC234" }).success).toBe(false);
  });

  it("transforma ano vazio em null e recusa ano absurdo", () => {
    expect(esquemaVeiculo.parse({ ...base, placa: "ABC1234" }).ano).toBeNull();
    expect(esquemaVeiculo.safeParse({ ...base, placa: "ABC1234", ano: "1800" }).success).toBe(false);
  });

  it("exige escolher o cliente", () => {
    expect(esquemaVeiculo.safeParse({ ...base, placa: "ABC1234", clienteId: "" }).success).toBe(false);
  });
});

describe("validação de item da OS", () => {
  it("converte quantidade e valor digitados", () => {
    expect(
      esquemaItem.parse({
        tipo: "peca",
        descricao: "Óleo",
        quantidade: "2,5",
        valorUnitarioCentavos: "45,90",
      }),
    ).toEqual({ tipo: "peca", descricao: "Óleo", quantidade: 2.5, valorUnitarioCentavos: 4590 });
  });

  it("recusa quantidade zero ou negativa e valor inválido", () => {
    const item = { tipo: "servico", descricao: "X", quantidade: "1", valorUnitarioCentavos: "10" };
    expect(esquemaItem.safeParse({ ...item, quantidade: "0" }).success).toBe(false);
    expect(esquemaItem.safeParse({ ...item, quantidade: "-1" }).success).toBe(false);
    expect(esquemaItem.safeParse({ ...item, valorUnitarioCentavos: "dez" }).success).toBe(false);
  });

  it("recusa tipo desconhecido", () => {
    expect(
      esquemaItem.safeParse({ tipo: "brinde", descricao: "X", quantidade: "1", valorUnitarioCentavos: "1" })
        .success,
    ).toBe(false);
  });
});
