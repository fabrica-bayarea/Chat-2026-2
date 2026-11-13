import { describe, expect, it } from "vitest";
import type { ExtractedDocument } from "./extract.js";
import { normalizeDocument, normalizeText } from "./normalize.js";

describe("normalizeText", () => {
  it("junta palavra quebrada com hífen no fim da linha", () => {
    expect(normalizeText("Centro Univer-\nsitário")).toBe("Centro Universitário");
  });

  it("junta linha quebrada no meio da frase", () => {
    expect(normalizeText("passou a integrar a infraestrutura do\nconhecimento.")).toBe(
      "passou a integrar a infraestrutura do conhecimento.",
    );
  });

  it("mantém a quebra quando a linha termina a frase", () => {
    expect(normalizeText("Primeira frase.\nsegunda linha")).toBe("Primeira frase.\nsegunda linha");
  });

  it("remove número de página solto e trilha de navegação", () => {
    expect(normalizeText("3\nAPRESENTAÇÃO\nHome > Transferência\nTexto")).toBe(
      "APRESENTAÇÃO\nTexto",
    );
  });

  it("remove pontilhado de sumário", () => {
    expect(normalizeText("APRESENTAÇÃO ........................ 3")).toBe("APRESENTAÇÃO 3");
  });

  it("limpa espaços, caracteres invisíveis e linhas em branco repetidas", () => {
    expect(normalizeText("  Bolsas e​   descontos \n\n\n\n\tFIES  ")).toBe(
      "Bolsas e descontos\n\nFIES",
    );
  });
});

describe("normalizeDocument", () => {
  it("descarta partes que ficam vazias depois da limpeza", () => {
    const doc = {
      collected: {} as ExtractedDocument["collected"],
      title: "  Guia   do\nestudante ",
      parts: [
        { text: "  \n 2 \n", page: 1 },
        { text: "Conteúdo", page: 2 },
      ],
    } satisfies ExtractedDocument;

    const result = normalizeDocument(doc);

    expect(result.title).toBe("Guia do estudante");
    expect(result.parts).toEqual([{ text: "Conteúdo", page: 2 }]);
  });
});
