import { describe, expect, it } from "vitest";
import type { Embedder } from "./ingestion/embed.js";
import type { KnowledgeStore, StoredMatch } from "./knowledge-store.js";
import { createRetriever } from "./retrieval/retrieve.js";

// Implementação mínima do contrato, só em memória, para garantir que a recuperação
// não depende do LibSQL
function createMemoryStore(): KnowledgeStore {
  let items: { vector: number[]; match: Omit<StoredMatch, "score"> }[] = [];

  const cosine = (a: number[], b: number[]) => {
    const dot = a.reduce((sum, value, i) => sum + value * b[i]!, 0);
    const norm = (v: number[]) => Math.sqrt(v.reduce((sum, value) => sum + value * value, 0));
    return dot / (norm(a) * norm(b));
  };

  return {
    async reset() {
      items = [];
    },
    async saveSource(_sourceId, chunks, vectors) {
      chunks.forEach((chunk, i) => {
        items.push({ vector: vectors[i]!, match: { id: chunk.id, metadata: chunk.metadata } });
      });
    },
    async search(vector, topK) {
      return items
        .map((item) => ({ ...item.match, score: cosine(vector, item.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },
  };
}

describe("KnowledgeStore", () => {
  it("permite trocar a base vetorial sem mudar a recuperação", async () => {
    const store = createMemoryStore();
    await store.saveSource(
      "https://www.iesb.br/biblioteca/",
      [
        {
          id: "1",
          metadata: {
            text: "A biblioteca abre às 7h.",
            sourceId: "https://www.iesb.br/biblioteca/",
            origin: "site",
            type: "html",
            title: "Biblioteca",
            chunkIndex: 0,
            totalChunks: 1,
            collectedAt: "2026-11-07T00:00:00.000Z",
            contentHash: "x",
          },
        },
      ],
      [[1, 0]],
    );

    const embed: Embedder = async () => [[1, 0]];
    const retrieve = createRetriever({ embed, store, topK: 4, minScore: 0.69, queryMaxChars: 200 });

    const result = await retrieve("que horas abre a biblioteca?");

    expect(result.found).toBe(true);
    expect(result.chunks[0]?.text).toBe("A biblioteca abre às 7h.");
    expect(result.sources[0]?.url).toBe("https://www.iesb.br/biblioteca/");
  });
});
