import { describe, expect, it } from "vitest";
import { esquemaCliente, esquemaItem, esquemaOrdem, esquemaVeiculo } from "./validacao";

describe("validação de cliente", () => {
  it("aceita cliente válido e transforma campos vazios em null", () => {
    const resultado = esquemaCliente.parse({
      nome: "  Transportes Teste  ",
      telefone: "(37) 99999-0000",
      email: "",
      documento: "",
      cidade: "",
      cep: "",
      numero: "",
      observacoes: "",
    });
    expect(resultado).toEqual({
      nome: "Transportes Teste", // trim() tirou os espaços
      telefone: "(37) 99999-0000",
      email: null,
      documento: null,
      cidade: null,
      cep: null,
      numero: null,
      observacoes: null,
    });
  });

  it("exige nome e telefone", () => {
    const resultado = esquemaCliente.safeParse({
      nome: " ",
      telefone: "",
      email: "",
      documento: "",
      cidade: "",
      cep: "",
      numero: "",
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
      cidade: "",
      cep: "",
      numero: "",
      observacoes: "",
    });
    expect(resultado.success).toBe(false);
  });
});

describe("validação de veículo", () => {
  const base = { clienteId: "1", marca: "Scania", modelo: "R 450", tipo: "", ano: "" };

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

describe("validação do bloco da OS", () => {
  const bloco = {
    placa: "abc-1d23",
    data: "2026-10-27",
    nome: "  João  ",
    telefone: "(37) 99999-0000",
    cidade: "",
    cep: "35500000",
    numero: "",
    marca: " Volkswagen ",
    modelo: "Constellation   24.280",
    tipoVeiculo: "",
  };

  it("normaliza placa, CEP e espaços, e transforma vazios em null", () => {
    expect(esquemaOrdem.parse(bloco)).toEqual({
      placa: "ABC1D23",
      data: "2026-10-27",
      nome: "João",
      telefone: "(37) 99999-0000",
      cidade: null,
      cep: "35500-000",
      numero: null,
      marca: "Volkswagen",
      modelo: "Constellation 24.280",
      tipoVeiculo: null,
    });
  });

  it("exige placa, nome, telefone, marca e modelo", () => {
    const resultado = esquemaOrdem.safeParse({
      ...bloco,
      placa: "",
      nome: "",
      telefone: "",
      marca: "",
      modelo: "",
    });
    const campos = resultado.error?.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["placa", "nome", "telefone", "marca", "modelo"]));
  });

  it("recusa CEP incompleto e data inválida", () => {
    expect(esquemaOrdem.safeParse({ ...bloco, cep: "3550" }).success).toBe(false);
    expect(esquemaOrdem.safeParse({ ...bloco, data: "27/10/2026" }).success).toBe(false);
  });
});
