import { describe, expect, it } from "vitest";
import { keywordScores, queryKeywords } from "./lexical.js";

describe("queryKeywords", () => {
  it("ignora acentos, caixa, palavras curtas e palavras comuns de pergunta", () => {
    expect(queryKeywords("Quais são os critérios da Bolsa Excelência do IESB?")).toEqual([
      ["criterios"],
      ["bolsa"],
      ["excelencia"],
    ]);
  });

  it("inclui as formas que o site usa para endereço e horário", () => {
    expect(queryKeywords("Qual o endereço?")[0]).toContain("cep");
    expect(queryKeywords("Qual o horário?")[0]).toContain("funcionamento");
  });
});

describe("keywordScores", () => {
  const texts = [
    "Bolsas e Descontos. Invista no seu futuro com condições especiais.",
    "BOLSA EXCELÊNCIA. O Programa Bolsa Excelência exige média mínima de 650 pontos.",
    "BOLSA ATLETA. Bolsa para atletas.",
  ];

  it("dá mais peso à palavra rara entre os textos", () => {
    const [geral, excelencia, atleta] = keywordScores("critérios da Bolsa Excelência", texts);
    expect(excelencia).toBeGreaterThan(geral!);
    expect(excelencia).toBeGreaterThan(atleta!);
  });

  it("encontra endereço pelo CEP e horário por funcionamento", () => {
    const [endereco, outro] = keywordScores("endereço do campus", [
      "Campus Sul - SGAS Quadra 613/614 - CEP: 70.200-730",
      "Laboratórios do campus",
    ]);
    expect(endereco).toBeGreaterThan(outro!);
  });

  it("pergunta sem palavra-chave dá zero para todos", () => {
    expect(keywordScores("como funciona?", texts)).toEqual([0, 0, 0]);
  });
});
