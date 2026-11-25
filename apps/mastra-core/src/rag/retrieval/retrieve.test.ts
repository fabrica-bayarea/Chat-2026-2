import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Embedder } from "../ingestion/embed.js";
import type { KnowledgeStore, StoredMatch } from "../knowledge-store.js";
import { createRetriever } from "./retrieve.js";

const site = {
  text: "O Campus Ceilândia fica na QNN 31.",
  sourceId: "https://www.iesb.br/estrutura/campus-ceilandia/",
  origin: "site",
  type: "html",
  title: "Campus Ceilândia",
  chunkIndex: 0,
  totalChunks: 3,
};

const pdf = {
  text: "O uso de IA deve ser declarado.",
  sourceId: "guia-uso-ia.pdf",
  origin: "documento",
  type: "pdf",
  title: "Guia de uso de IA",
  page: 4,
};

function match(id: string, score: number, metadata: Record<string, unknown>): StoredMatch {
  return { id, score, metadata };
}

describe("createRetriever", () => {
  let embed: ReturnType<typeof vi.fn<Embedder>>;
  let search: ReturnType<typeof vi.fn<KnowledgeStore["search"]>>;

  function retriever(minScore = 0.69) {
    return createRetriever({ embed, store: { search }, topK: 4, minScore, queryMaxChars: 200 });
  }

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    embed = vi.fn<Embedder>(async () => [[0.1, 0.2, 0.3]]);
    search = vi.fn<KnowledgeStore["search"]>(async () => []);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("busca com o vetor da consulta normalizada", async () => {
    await retriever()("  onde fica   o campus? ");

    expect(embed).toHaveBeenCalledWith(["onde fica o campus?"]);
    expect(search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 4);
  });

  it("devolve conteúdo, metadados e citação de cada trecho", async () => {
    search.mockResolvedValue([match("1", 0.8, site), match("2", 0.75, pdf)]);

    const result = await retriever()("onde fica o campus?");

    expect(result.found).toBe(true);
    expect(result.chunks[0]).toMatchObject({
      text: site.text,
      score: 0.8,
      source: { sourceId: site.sourceId, origin: "site", type: "html", title: site.title },
      citation: { label: "Campus Ceilândia — iesb.br", url: site.sourceId },
    });
    expect(result.chunks[0]?.source).not.toHaveProperty("text");
    expect(result.chunks[1]?.citation).toMatchObject({ document: "guia-uso-ia.pdf", page: 4 });
    expect(result.sources).toHaveLength(2);
  });

  it("descarta trechos abaixo da similaridade mínima", async () => {
    search.mockResolvedValue([match("1", 0.8, site), match("2", 0.6, pdf)]);

    const result = await retriever(0.69)("onde fica o campus?");

    expect(result.chunks.map((chunk) => chunk.source.sourceId)).toEqual([site.sourceId]);
  });

  it("trata consulta sem resultado relevante", async () => {
    search.mockResolvedValue([match("1", 0.61, site)]);

    const result = await retriever()("receita de bolo");

    expect(result).toEqual({ query: "receita de bolo", found: false, chunks: [], sources: [] });
  });

  it("trata base vazia como consulta sem resultado", async () => {
    const result = await retriever()("onde fica o campus?");
    expect(result.found).toBe(false);
  });

  it("não cria fonte para trecho sem metadados de origem", async () => {
    search.mockResolvedValue([
      match("sem-fonte", 0.9, { text: "Texto solto" }),
      match("site-sem-url", 0.9, { ...site, sourceId: "campus-ceilandia" }),
      match("sem-texto", 0.9, { ...pdf, text: "  " }),
      match("origem-desconhecida", 0.9, { ...pdf, origin: "rede-social" }),
      match("valido", 0.85, pdf),
    ]);

    const result = await retriever()("uso de ia");

    expect(result.chunks.map((chunk) => chunk.text)).toEqual([pdf.text]);
    expect(result.sources).toEqual([
      {
        label: "Guia de uso de IA (guia-uso-ia.pdf), p. 4",
        origin: "documento",
        document: "guia-uso-ia.pdf",
        page: 4,
      },
    ]);
    expect(console.warn).toHaveBeenCalledTimes(4);
  });

  it("informa indisponibilidade quando a base falha", async () => {
    search.mockRejectedValue(new Error("SQLITE_CANTOPEN"));

    await expect(retriever()("onde fica o campus?")).rejects.toMatchObject({
      name: "RetrievalError",
      kind: "unavailable",
      message: "Não foi possível consultar a base de conhecimento.",
    });
  });

  it("rejeita consulta vazia sem consultar a base", async () => {
    await expect(retriever()("   ")).rejects.toMatchObject({ kind: "invalid_query" });
    expect(embed).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });
});
