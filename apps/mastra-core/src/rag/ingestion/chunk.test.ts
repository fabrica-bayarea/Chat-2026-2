import { describe, expect, it } from "vitest";
import { chunkDocument } from "./chunk.js";
import type { ExtractedDocument } from "./extract.js";

function doc(parts: ExtractedDocument["parts"]): ExtractedDocument {
  return {
    collected: {
      source: { id: "teste", origin: "site", type: "html", location: "teste" },
      content: Buffer.from(""),
      collectedAt: "2026-11-27T00:00:00.000Z",
    },
    title: "Teste",
    parts,
  };
}

describe("chunkDocument", () => {
  it("todo trecho de uma seção começa com o título dela", async () => {
    const body = "Exige média mínima de 650 pontos nas provas objetivas. ".repeat(10);
    const chunks = await chunkDocument(
      doc([{ text: `BOLSA EXCELÊNCIA\n${body}`, section: "BOLSA EXCELÊNCIA" }]),
      { size: 200, overlap: 0 },
    );

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.text.startsWith("BOLSA EXCELÊNCIA")).toBe(true);
  });

  it("nunca junta duas seções no mesmo trecho", async () => {
    const chunks = await chunkDocument(
      doc([
        { text: "BOLSA SANTANDER\nInscrições até 31/08/2026.", section: "BOLSA SANTANDER" },
        { text: "BOLSA EXCELÊNCIA\nMédia mínima de 650 pontos.", section: "BOLSA EXCELÊNCIA" },
      ]),
      { size: 1000, overlap: 0 },
    );

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "BOLSA SANTANDER\nInscrições até 31/08/2026.",
      "BOLSA EXCELÊNCIA\nMédia mínima de 650 pontos.",
    ]);
  });

  it("parte sem seção segue sem título", async () => {
    const chunks = await chunkDocument(doc([{ text: "Texto da introdução." }]), {
      size: 1000,
      overlap: 0,
    });
    expect(chunks).toEqual([{ text: "Texto da introdução.", page: undefined }]);
  });
});
