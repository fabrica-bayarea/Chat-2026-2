import { describe, expect, it } from "vitest";
import { splitQuestion } from "./question-parts.js";

const options = { maxParts: 4, maxChars: 1000 };

describe("splitQuestion", () => {
  it("pergunta simples vira uma consulta", () => {
    expect(splitQuestion("Onde fica o campus de Ceilândia?", options)).toEqual([
      "Onde fica o campus de Ceilândia?",
    ]);
  });

  it("separa várias perguntas da mesma mensagem", () => {
    const text =
      "Sou de Ceilândia. Onde fica o campus de Ceilândia? Como funciona a transferência? E existe algum desconto para quem vem transferido?";
    expect(splitQuestion(text, options)).toEqual([
      "Onde fica o campus de Ceilândia?",
      "Como funciona a transferência?",
      "E existe algum desconto para quem vem transferido?",
    ]);
  });

  it("separa perguntas ligadas por 'e' seguido de palavra interrogativa", () => {
    expect(
      splitQuestion("Como funciona a biblioteca do IESB e como eu faço para falar com a ouvidoria?", options),
    ).toEqual(["Como funciona a biblioteca do IESB", "como eu faço para falar com a ouvidoria?"]);
  });

  it("não separa 'e' que só liga palavras", () => {
    expect(splitQuestion("Quais bolsas e descontos o IESB oferece?", options)).toEqual([
      "Quais bolsas e descontos o IESB oferece?",
    ]);
  });

  it("pergunta curta leva junto a pergunta anterior", () => {
    expect(splitQuestion("Qual o horário da biblioteca? E no sábado?", options)).toEqual([
      "Qual o horário da biblioteca?",
      "Qual o horário da biblioteca? E no sábado?",
    ]);
  });

  it("pergunta curta no começo leva junto a frase anterior", () => {
    expect(splitQuestion("Quero estudar no Campus Sul. Onde fica?", options)).toEqual([
      "Quero estudar no Campus Sul. Onde fica?",
    ]);
  });

  it("ignora o relato e busca só as perguntas de uma mensagem longa", () => {
    const story = "Trabalho durante o dia e sempre quis fazer faculdade. ".repeat(20);
    const parts = splitQuestion(
      `${story}O IESB tem bolsa para quem fez o ENEM? Quais são as formas de ingresso?`,
      options,
    );
    expect(parts).toEqual([
      "O IESB tem bolsa para quem fez o ENEM?",
      "Quais são as formas de ingresso?",
    ]);
  });

  it("sem pergunta explícita usa a mensagem, mantendo o final quando passa do limite", () => {
    const text = `${"contexto ".repeat(200)}quero saber sobre a colação de grau`;
    const [part] = splitQuestion(text, { maxParts: 4, maxChars: 100 });
    expect(part!.length).toBeLessThanOrEqual(100);
    expect(part).toMatch(/quero saber sobre a colação de grau$/);
  });

  it("limita a quantidade de consultas", () => {
    const text = "Onde fica a biblioteca? Como falo com a ouvidoria? O que é o ENADE? O que é a CPA? Como é a colação?";
    expect(splitQuestion(text, { maxParts: 3, maxChars: 1000 })).toHaveLength(3);
  });

  it("corta pergunta acima do limite em vez de descartar a busca", () => {
    const longQuestion = `${"muito ".repeat(300)}longa?`;
    const [part] = splitQuestion(longQuestion, { maxParts: 4, maxChars: 200 });
    expect(part!.length).toBeLessThanOrEqual(200);
    expect(part!.endsWith("longa?")).toBe(true);
  });

  it("mensagem vazia não gera consulta", () => {
    expect(splitQuestion("   ", options)).toEqual([]);
  });
});
