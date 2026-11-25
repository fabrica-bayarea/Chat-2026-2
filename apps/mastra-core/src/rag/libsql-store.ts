import { mkdir } from "node:fs/promises";
import path from "node:path";
import { LibSQLVector } from "@mastra/libsql";
import type { RagConfig } from "../config/rag.config.js";
import type { KnowledgeStore } from "./knowledge-store.js";

// Implementação do KnowledgeStore com LibSQL: um arquivo .db local, sem servidor
export async function createLibSQLKnowledgeStore(
  config: Pick<RagConfig, "vectorDbUrl" | "indexName">,
): Promise<KnowledgeStore> {
  // O LibSQL não cria a pasta do arquivo .db sozinho
  if (config.vectorDbUrl.startsWith("file:")) {
    await mkdir(path.dirname(config.vectorDbUrl.slice("file:".length)), { recursive: true });
  }

  const vector = new LibSQLVector({ id: "rag-vector", url: config.vectorDbUrl });
  let indexReady = false;

  return {
    // A ingestão recria o índice do zero a cada execução: apagar e regravar vetores no
    // mesmo índice faz a busca aproximada do LibSQL deixar de encontrar alguns deles
    async reset() {
      const indexes = await vector.listIndexes();
      if (indexes.includes(config.indexName)) {
        await vector.deleteIndex({ indexName: config.indexName });
      }
      indexReady = false;
    },

    async saveSource(sourceId, chunks, vectors) {
      if (chunks.length !== vectors.length) {
        throw new Error(`Quantidade de chunks e embeddings diferente para ${sourceId}`);
      }
      if (chunks.length === 0) return;

      // A dimensão só é conhecida depois do primeiro embedding gerado
      if (!indexReady) {
        await vector.createIndex({
          indexName: config.indexName,
          dimension: vectors[0]!.length,
          metric: "cosine",
        });
        indexReady = true;
      }

      await vector.upsert({
        indexName: config.indexName,
        ids: chunks.map((chunk) => chunk.id),
        vectors,
        metadata: chunks.map((chunk) => chunk.metadata),
      });
    },

    async search(queryVector, topK) {
      // Sem índice a ingestão ainda não foi executada: não há o que encontrar
      const indexes = await vector.listIndexes();
      if (!indexes.includes(config.indexName)) return [];

      const results = await vector.query({ indexName: config.indexName, queryVector, topK });
      return results.map((result) => ({
        id: result.id,
        score: result.score,
        metadata: result.metadata ?? {},
      }));
    },
  };
}
