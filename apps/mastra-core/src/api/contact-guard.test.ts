import { describe, expect, it } from "vitest";
import { contactKeys, UNKNOWN_CONTACT } from "../rag/contacts.js";
import { createContactGuard } from "./contact-guard.js";

const allowed = new Set(contactKeys("Biblioteca: (61) 3962-4816"));

function streamThrough(pieces: string[]): { text: string; redacted: number } {
  const guard = createContactGuard(allowed);
  let text = "";
  for (const piece of pieces) text += guard.push("t1", piece);
  text += guard.flush("t1");
  return { text, redacted: guard.redacted };
}

describe("createContactGuard", () => {
  it("segura o texto até o fim da linha e libera a linha inteira", () => {
    const guard = createContactGuard(allowed);
    expect(guard.push("t1", "A biblioteca ")).toBe("");
    expect(guard.push("t1", "abre às 7h45.\nO tele")).toBe("A biblioteca abre às 7h45.\n");
    expect(guard.flush("t1")).toBe("O tele");
  });

  it("mantém contato que está na base mesmo quebrado em vários pedaços", () => {
    const result = streamThrough(["Ligue para (61) 39", "62-48", "16 para falar com a biblioteca."]);
    expect(result).toEqual({ text: "Ligue para (61) 3962-4816 para falar com a biblioteca.", redacted: 0 });
  });

  it("troca e-mail e telefone inventados, mesmo quebrados em pedaços", () => {
    const result = streamThrough(["Escreva para ouvid", "oria@iesb", ".br ou ligue (61) 3333", "-0000.\n"]);
    expect(result.redacted).toBe(2);
    expect(result.text).toBe(`Escreva para ${UNKNOWN_CONTACT} ou ligue ${UNKNOWN_CONTACT}.\n`);
  });

  it("libera frases de uma linha longa sem esperar o fim dela", () => {
    const guard = createContactGuard(allowed);
    const out = guard.push("t1", `${"Frase longa sem quebra de linha. ".repeat(12)}Fim`);
    expect(out.endsWith(". ")).toBe(true);
    expect(guard.flush("t1")).toBe("Fim");
  });

  it("libera o que sobrou de todos os textos no fim do stream", () => {
    const guard = createContactGuard(allowed);
    guard.push("t1", "Resposta sem fim de linha");
    guard.push("t2", "Outra");
    expect(guard.flushAll()).toEqual([
      ["t1", "Resposta sem fim de linha"],
      ["t2", "Outra"],
    ]);
  });
});
