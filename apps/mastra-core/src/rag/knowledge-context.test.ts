import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildKnowledgeContext, mergeChunks, type Retrieve } from "./knowledge-context.js";
import { toCitation } from "./retrieval/citation.js";
import type { RetrievalResult, RetrievedChunk } from "./retrieval/retrieve.js";

function chunk(page: string, chunkIndex: number, text: string): RetrievedChunk {
  const source = {
    sourceId: `https://www.iesb.br/${page}/`,
    origin: "site" as const,
    type: "html" as const,
    title: page,
    chunkIndex,
  };
  return { text, score: 0.8, source, citation: toCitation(source) };
}

function result(query: string, chunks: RetrievedChunk[]): RetrievalResult {
  return { query, found: chunks.length > 0, chunks, sources: chunks.map((c) => c.citation) };
}

describe("buildKnowledgeContext", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mensagem sem texto (só anexo) não busca na base", async () => {
    const retrieve = vi.fn<Retrieve>();

    const context = await buildKnowledgeContext("   ", retrieve);

    expect(retrieve).not.toHaveBeenCalled();
    expect(context.found).toBe(false);
    expect(context.systemMessage).toContain("Nenhum trecho relevante");
  });

  it("cancelamento do chat para de esperar a busca", async () => {
    const neverEnds: Retrieve = () => new Promise(() => {});
    const controller = new AbortController();

    const pending = buildKnowledgeContext("onde fica a biblioteca?", neverEnds, controller.signal);
    controller.abort();

    const context = await pending;
    expect(context.found).toBe(false);
    expect(context.sources).toEqual([]);
  });

  it("erro na busca não vaza a pergunta no log", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing: Retrieve = async () => {
      throw new Error("falhou com a pergunta: minha senha é 123");
    };

    const context = await buildKnowledgeContext("minha senha é 123", failing);

    expect(context.found).toBe(false);
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).not.toContain("senha");
  });

  it("mensagem com várias perguntas busca cada uma e envia os trechos de todas", async () => {
    const byQuestion: Record<string, RetrievedChunk[]> = {
      "Como funciona a biblioteca do IESB": [chunk("biblioteca", 0, "Acervo de 90 mil exemplares.")],
      "como eu faço para falar com a ouvidoria?": [chunk("ouvidoria", 0, "A ouvidoria atende pelo formulário.")],
    };
    const retrieve = vi.fn<Retrieve>(async (question) => result(question, byQuestion[question] ?? []));

    const context = await buildKnowledgeContext(
      "Como funciona a biblioteca do IESB e como eu faço para falar com a ouvidoria?",
      retrieve,
    );

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(context.found).toBe(true);
    expect(context.systemMessage).toContain("Acervo de 90 mil exemplares.");
    expect(context.systemMessage).toContain("A ouvidoria atende pelo formulário.");
    expect(context.sources.map((source) => source.url)).toEqual([
      "https://www.iesb.br/biblioteca/",
      "https://www.iesb.br/ouvidoria/",
    ]);
  });

  it("pergunta acima do limite de caracteres ainda é buscada", async () => {
    const retrieve = vi.fn<Retrieve>(async (question) => result(question, []));

    await buildKnowledgeContext(`${"contexto ".repeat(300)}onde fica a biblioteca?`, retrieve, undefined, {
      maxParts: 4,
      maxChars: 200,
      maxChunks: 8,
    });

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(retrieve.mock.calls[0]![0].length).toBeLessThanOrEqual(200);
  });
});

describe("mergeChunks", () => {
  it("alterna entre as perguntas, não repete trecho e respeita o limite", () => {
    const shared = chunk("transferencia", 0, "Trecho que as duas perguntas encontraram.");
    const merged = mergeChunks(
      [
        result("a", [shared, chunk("transferencia", 1, "a2"), chunk("transferencia", 2, "a3")]),
        result("b", [shared, chunk("bolsas", 5, "b2"), chunk("bolsas", 6, "b3")]),
      ],
      4,
    );

    expect(merged.map((item) => item.text)).toEqual([
      "Trecho que as duas perguntas encontraram.",
      "a2",
      "b2",
      "a3",
    ]);
  });
});
