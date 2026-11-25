import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Source } from "../sources.js";
import type { Embedder } from "./embed.js";
import { IngestionError } from "./errors.js";
import { runIngestion, type IngestionStore } from "./pipeline.js";

const config = { chunkSize: 200, chunkOverlap: 20, fetchTimeoutMs: 1000 };

describe("runIngestion", () => {
  let dir: string;
  let embed: ReturnType<typeof vi.fn<Embedder>>;
  let store: { reset: ReturnType<typeof vi.fn>; saveSource: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    dir = await mkdtemp(path.join(tmpdir(), "rag-"));
    embed = vi.fn<Embedder>(async (texts) => texts.map(() => [0.1, 0.2, 0.3]));
    store = { reset: vi.fn(async () => {}), saveSource: vi.fn(async () => {}) };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  async function file(name: string, content: string, type: Source["type"]): Promise<Source> {
    const location = path.join(dir, name);
    await writeFile(location, content);
    return { id: name, origin: "documento", type, location };
  }

  it("processa as fontes e salva chunks com embeddings", async () => {
    const source = await file("pagina.html", "<title>Biblioteca</title><p>Horário</p>", "html");

    const summary = await runIngestion(config, {
      sources: [source],
      embed,
      store: store as IngestionStore,
    });

    expect(summary).toEqual({ sources: 1, processed: 1, chunks: 1, failures: [] });
    expect(store.reset).toHaveBeenCalledOnce();

    const [sourceId, chunks, vectors] = store.saveSource.mock.calls[0]!;
    expect(sourceId).toBe("pagina.html");
    expect(chunks[0].metadata).toMatchObject({ title: "Biblioteca", sourceId: "pagina.html" });
    expect(vectors).toEqual([[0.1, 0.2, 0.3]]);
  });

  it("registra a falha de uma fonte e continua com as demais", async () => {
    const broken = await file("corrompido.pdf", "não é um pdf", "pdf");
    const missing: Source = {
      id: "sumiu.docx",
      origin: "documento",
      type: "docx",
      location: path.join(dir, "sumiu.docx"),
    };
    const ok = await file("ok.html", "<p>Conteúdo</p>", "html");

    const summary = await runIngestion(config, {
      sources: [broken, missing, ok],
      embed,
      store: store as IngestionStore,
    });

    expect(summary.processed).toBe(1);
    expect(summary.failures).toEqual([
      { sourceId: "corrompido.pdf", stage: "extracao", message: expect.any(String) },
      { sourceId: "sumiu.docx", stage: "coleta", message: expect.any(String) },
    ]);
    expect(store.saveSource).toHaveBeenCalledOnce();
  });

  it("trata fonte sem texto extraível como falha de extração", async () => {
    const empty = await file("vazio.html", "<script>x()</script>", "html");

    const summary = await runIngestion(config, {
      sources: [empty],
      embed,
      store: store as IngestionStore,
    });

    expect(summary.failures[0]).toMatchObject({ sourceId: "vazio.html", stage: "extracao" });
    expect(summary.failures[0]?.message).toContain("nenhum texto extraível");
    expect(store.saveSource).not.toHaveBeenCalled();
  });

  it("não apaga a base quando o modelo de embeddings está indisponível", async () => {
    embed.mockRejectedValue(new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } }));
    const source = await file("ok.html", "<p>Conteúdo</p>", "html");

    const result = runIngestion(config, { sources: [source], embed, store: store as IngestionStore });

    await expect(result).rejects.toMatchObject({
      stage: "embeddings",
      message: "não foi possível conectar",
    });
    expect(store.reset).not.toHaveBeenCalled();
  });

  it("avisa quando o modelo de embeddings não foi baixado", async () => {
    embed.mockRejectedValue(Object.assign(new Error("Not Found"), { statusCode: 404 }));
    const source = await file("ok.html", "<p>Conteúdo</p>", "html");

    const result = runIngestion(config, { sources: [source], embed, store: store as IngestionStore });

    await expect(result).rejects.toMatchObject({
      stage: "embeddings",
      message: "modelo de embeddings não encontrado no Ollama",
    });
    expect(store.reset).not.toHaveBeenCalled();
  });

  it("interrompe a ingestão quando a gravação na base falha", async () => {
    store.saveSource.mockRejectedValue(new Error("disk I/O error"));
    const first = await file("a.html", "<p>Primeira</p>", "html");
    const second = await file("b.html", "<p>Segunda</p>", "html");

    const result = runIngestion(config, {
      sources: [first, second],
      embed,
      store: store as IngestionStore,
    });

    await expect(result).rejects.toBeInstanceOf(IngestionError);
    await expect(result).rejects.toMatchObject({ stage: "armazenamento" });
    expect(store.saveSource).toHaveBeenCalledOnce();
  });
});
