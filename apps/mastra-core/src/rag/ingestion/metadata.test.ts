import { describe, expect, it } from "vitest";
import type { ExtractedDocument } from "./extract.js";
import { prepareChunks } from "./metadata.js";

const doc: ExtractedDocument = {
  collected: {
    source: { id: "edital.pdf", origin: "documento", type: "pdf", location: "/docs/edital.pdf" },
    content: Buffer.from(""),
    collectedAt: "2026-11-04T00:00:00.000Z",
  },
  title: "Edital 2027",
  parts: [],
};

describe("prepareChunks", () => {
  it("preserva origem, título, página e posição de cada chunk", () => {
    const [first, second] = prepareChunks(doc, [
      { text: "Inscrições abertas", page: 1 },
      { text: "Documentos necessários", page: 2 },
    ]);

    expect(first?.metadata).toMatchObject({
      text: "Inscrições abertas",
      sourceId: "edital.pdf",
      origin: "documento",
      type: "pdf",
      title: "Edital 2027",
      page: 1,
      chunkIndex: 0,
      totalChunks: 2,
      collectedAt: "2026-11-04T00:00:00.000Z",
    });
    expect(second?.metadata).toMatchObject({ page: 2, chunkIndex: 1 });
  });

  it("não inclui página quando a fonte não tem páginas", () => {
    const [chunk] = prepareChunks(doc, [{ text: "Texto do site" }]);
    expect(chunk?.metadata).not.toHaveProperty("page");
  });

  it("gera ids estáveis entre execuções e diferentes entre chunks", () => {
    const chunks = [{ text: "a" }, { text: "b" }];
    const first = prepareChunks(doc, chunks).map((chunk) => chunk.id);
    const again = prepareChunks(doc, chunks).map((chunk) => chunk.id);

    expect(again).toEqual(first);
    expect(new Set(first).size).toBe(2);
  });

  it("calcula o hash a partir do texto do chunk", () => {
    const [a] = prepareChunks(doc, [{ text: "mesmo texto" }]);
    const [b] = prepareChunks({ ...doc, title: "Outro título" }, [{ text: "mesmo texto" }]);
    expect(a?.metadata.contentHash).toBe(b?.metadata.contentHash);
  });
});
