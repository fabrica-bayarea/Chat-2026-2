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

describe("createContactGuard com assuntos dos trechos", () => {
  const topics = [
    { names: ["biblioteca"], contacts: contactKeys("(61) 3962-4816") },
    { names: ["ouvidoria"], contacts: [] },
  ];

  function run(text: string) {
    const guard = createContactGuard(new Set(contactKeys("(61) 3962-4816")), topics);
    return { text: guard.push("t1", text) + guard.flush("t1"), redacted: guard.redacted };
  }

  it("mantém o contato na linha do setor dono dele", () => {
    const text = "A biblioteca atende pelo telefone (61) 3962-4816.\n";
    expect(run(text)).toEqual({ text, redacted: 0 });
  });

  it("retira o contato de um setor usado para outro", () => {
    const result = run("Para falar com a ouvidoria, ligue (61) 3962-4816.\n");
    expect(result.redacted).toBe(1);
    expect(result.text).toBe(`Para falar com a ouvidoria, ligue ${UNKNOWN_CONTACT}.\n`);
  });

  it("linha sem setor citado mantém o contato da base", () => {
    expect(run("Ligue (61) 3962-4816.\n").redacted).toBe(0);
  });

  it("nunca mostra a linha interna de contatos do contexto", () => {
    const result = run("Resposta.\nContatos deste trecho (Biblioteca): (61) 3962-4816\n");
    expect(result.text).not.toMatch(/Contatos deste trecho/);
    expect(result.text).toContain("Resposta.");
  });
});

describe("createContactGuard e a linha interna colada no texto", () => {
  it("retira a frase interna mesmo no fim de outra linha", () => {
    const guard = createContactGuard(new Set());
    const text =
      guard.push("t1", "O campus fica na QNN 31. Contatos deste trecho (CAMPUS CEILÂNDIA): nenhum.\n") +
      guard.flush("t1");
    expect(text).toBe("O campus fica na QNN 31.\n");
  });
});
