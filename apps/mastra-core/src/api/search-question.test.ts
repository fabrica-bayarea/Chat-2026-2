import { describe, expect, it } from "vitest";
import { getSearchQuestion } from "./search-question.js";

function user(text: string) {
  return { role: "user" as const, parts: [{ type: "text", text }] };
}

function assistant(text: string) {
  return { role: "assistant" as const, parts: [{ type: "text", text }] };
}

function attachmentOnly() {
  return {
    role: "user" as const,
    parts: [{ type: "file", mediaType: "application/pdf", url: "data:application/pdf;base64,AA==" }],
  };
}

describe("getSearchQuestion", () => {
  it("usa só a última pergunta quando ela é completa", () => {
    const messages = [
      user("Qual o horário da biblioteca?"),
      assistant("Das 8h às 22h."),
      user("Como funciona a transferência de curso?"),
    ];
    expect(getSearchQuestion(messages)).toBe("Como funciona a transferência de curso?");
  });

  it("junta a pergunta anterior quando a última é uma continuação curta", () => {
    const messages = [
      user("Qual o horário da biblioteca?"),
      assistant("Das 8h às 22h."),
      user("E no sábado?"),
    ];
    expect(getSearchQuestion(messages)).toBe("Qual o horário da biblioteca?\nE no sábado?");
  });

  it("pergunta curta sem pergunta anterior segue sozinha", () => {
    expect(getSearchQuestion([user("Horário da biblioteca?")])).toBe("Horário da biblioteca?");
  });

  it("ignora mensagem anterior só com anexo", () => {
    const messages = [user("Qual o valor da mensalidade?"), attachmentOnly(), user("E com bolsa?")];
    expect(getSearchQuestion(messages)).toBe("Qual o valor da mensalidade?\nE com bolsa?");
  });

  it("última mensagem só com anexo não gera busca", () => {
    expect(getSearchQuestion([user("Qual o valor da mensalidade?"), attachmentOnly()])).toBe("");
  });
});
