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

describe("createRetriever com expansão de páginas pequenas", () => {
  const sibling = (chunkIndex: number, text: string) => ({ ...site, chunkIndex, text });

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup(expandSourcesUpTo: number) {
    const embed = vi.fn<Embedder>(async () => [[0.1, 0.2, 0.3]]);
    const search = vi.fn<KnowledgeStore["search"]>(async () => [match("1", 0.8, site)]);
    const searchInSource = vi.fn<NonNullable<KnowledgeStore["searchInSource"]>>(async () => [
      match("1", 0.8, site),
      match("3", 0.5, sibling(2, "Endereço: QNN 31, Ceilândia Norte.")),
      match("2", 0.55, sibling(1, "Laboratórios e auditórios.")),
    ]);
    const retrieve = createRetriever({
      embed,
      store: { search, searchInSource },
      topK: 4,
      minScore: 0.69,
      queryMaxChars: 200,
      expandSourcesUpTo,
    });
    return { retrieve, searchInSource };
  }

  it("traz os outros trechos da página pequena, em ordem, mesmo abaixo da similaridade mínima", async () => {
    const { retrieve, searchInSource } = setup(3);

    const result = await retrieve("qual o endereço do campus de Ceilândia?");

    expect(searchInSource).toHaveBeenCalledWith([0.1, 0.2, 0.3], site.sourceId, 3);
    expect(result.chunks.map((chunk) => chunk.text)).toEqual([
      site.text,
      "Laboratórios e auditórios.",
      "Endereço: QNN 31, Ceilândia Norte.",
    ]);
    expect(result.sources).toHaveLength(1);
  });

  it("não expande página maior que o limite", async () => {
    const { retrieve, searchInSource } = setup(2);

    const result = await retrieve("qual o endereço do campus de Ceilândia?");

    expect(searchInSource).not.toHaveBeenCalled();
    expect(result.chunks).toHaveLength(1);
  });

  it("falha na expansão mantém os trechos já encontrados", async () => {
    const { retrieve, searchInSource } = setup(3);
    searchInSource.mockRejectedValue(new Error("base ocupada"));

    const result = await retrieve("qual o endereço do campus de Ceilândia?");

    expect(result.chunks.map((chunk) => chunk.text)).toEqual([site.text]);
  });
});


describe("createRetriever com reforço por palavras-chave", () => {
  const generic = { ...pdf, text: "Bolsas e Descontos. Condições especiais.", sourceId: "bolsas.pdf", title: "Bolsas" };
  const excellence = { ...pdf, text: "BOLSA EXCELÊNCIA exige média de 650 pontos.", sourceId: "excelencia.pdf", title: "Excelência" };
  const hours = { ...pdf, text: "HORÁRIOS DE FUNCIONAMENTO da biblioteca: 7h45 às 22h.", sourceId: "horarios.pdf", title: "Horários" };

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function retrieverWith(matches: StoredMatch[], topK = 1) {
    return createRetriever({
      embed: vi.fn<Embedder>(async () => [[0.1, 0.2, 0.3]]),
      store: { search: vi.fn<KnowledgeStore["search"]>(async () => matches) },
      topK,
      minScore: 0.69,
      queryMaxChars: 200,
      lexicalWeight: 0.15,
    });
  }

  it("coloca na frente o trecho com o nome próprio da pergunta", async () => {
    const result = await retrieverWith([match("1", 0.77, generic), match("2", 0.72, excellence)])(
      "Quais os critérios da Bolsa Excelência?",
    );
    expect(result.chunks.map((chunk) => chunk.text)).toEqual([excellence.text]);
  });

  it("aceita trecho pouco abaixo do mínimo quando ele traz as palavras-chave da pergunta", async () => {
    const result = await retrieverWith([match("1", 0.73, generic), match("2", 0.66, hours)], 2)(
      "Qual o horário da biblioteca?",
    );
    expect(result.chunks.map((chunk) => chunk.text)).toContain(hours.text);
  });

  it("sem nenhum trecho acima do mínimo não devolve nada, mesmo com palavras-chave", async () => {
    const result = await retrieverWith([match("1", 0.66, hours)])("Qual o horário da biblioteca?");
    expect(result.found).toBe(false);
    expect(result.chunks).toEqual([]);
  });
});
