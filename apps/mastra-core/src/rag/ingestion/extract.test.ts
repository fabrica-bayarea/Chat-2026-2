import { describe, expect, it } from "vitest";
import type { Source } from "../sources.js";
import type { CollectedSource } from "./collect.js";
import { extractText } from "./extract.js";

function collected(source: Partial<Source>, content: string | Buffer): CollectedSource {
  return {
    source: { id: "teste", origin: "site", type: "html", location: "teste", ...source },
    content: Buffer.isBuffer(content) ? content : Buffer.from(content),
    collectedAt: "2026-11-04T00:00:00.000Z",
  };
}

// PDF válido com uma página e nenhum texto, como um documento digitalizado
const BLANK_PDF = [
  "%PDF-1.4",
  "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj",
  "trailer<</Root 1 0 R>>",
  "%%EOF",
].join("\n");

describe("extractText", () => {
  it("extrai título e conteúdo do HTML sem cabeçalho, menu e rodapé", async () => {
    const html = `
      <html>
        <head><title>Transferência | IESB | Centro Universitário</title></head>
        <body>
          <header>Menu principal</header>
          <nav><a>Cursos</a></nav>
          <main><h1>Transferência</h1><p>Quem tem direito</p></main>
          <script>console.log("x")</script>
          <footer>Rodapé</footer>
        </body>
      </html>`;

    const doc = await extractText(collected({}, html));
    const text = doc.parts[0]?.text ?? "";

    expect(doc.title).toBe("Transferência");
    expect(text).toContain("Transferência");
    expect(text).toContain("Quem tem direito");
    expect(text).not.toMatch(/Menu principal|Cursos|Rodapé|console/);
  });

  it("separa o HTML em seções pelos títulos h1 a h3", async () => {
    const html = `
      <html><body><main>
        <p>Introdução da página</p>
        <h1>BOLSAS</h1>
        <h3>BOLSA SANTANDER GRADUAÇÃO</h3><p>Inscrições até o dia 31/08/2026.</p>
        <h3>BOLSA EXCELÊNCIA</h3><p>Exige média mínima de 650 pontos.</p>
      </main></body></html>`;

    const doc = await extractText(collected({}, html));

    expect(doc.parts.map((part) => part.section)).toEqual([
      undefined,
      "BOLSA SANTANDER GRADUAÇÃO",
      "BOLSA EXCELÊNCIA",
    ]);
    expect(doc.parts[1]?.text).toContain("31/08/2026");
    expect(doc.parts[1]?.text).not.toContain("650");
    expect(doc.parts[2]?.text).toContain("650");
    expect(doc.parts[2]?.text).not.toContain("31/08/2026");
  });

  it("usa o id da fonte quando a página não tem título", async () => {
    const doc = await extractText(collected({ id: "https://www.iesb.br/x/" }, "<p>Oi</p>"));
    expect(doc.title).toBe("https://www.iesb.br/x/");
  });

  it("gera uma parte por página do PDF, mesmo sem texto", async () => {
    const doc = await extractText(
      collected({ type: "pdf", origin: "documento", location: "/docs/edital-2027.pdf" }, BLANK_PDF),
    );

    expect(doc.title).toBe("edital 2027");
    expect(doc.parts).toHaveLength(1);
    expect(doc.parts[0]).toMatchObject({ page: 1 });
    expect(doc.parts[0]?.text.trim()).toBe("");
  });

  it("falha com PDF corrompido", async () => {
    await expect(
      extractText(collected({ type: "pdf", origin: "documento" }, "não é um pdf")),
    ).rejects.toThrow();
  });

  it("falha com DOCX corrompido", async () => {
    await expect(
      extractText(collected({ type: "docx", origin: "documento" }, "não é um docx")),
    ).rejects.toThrow();
  });
});
