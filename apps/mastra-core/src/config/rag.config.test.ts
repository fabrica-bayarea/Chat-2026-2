import { describe, expect, it } from "vitest";
import { loadRagConfig } from "./rag.config.js";

describe("loadRagConfig", () => {
  it("usa os valores padrão quando nada é definido", () => {
    expect(loadRagConfig({})).toEqual({
      ollamaBaseUrl: "http://localhost:11434/api",
      embeddingModel: "nomic-embed-text",
      vectorDbUrl: "file:./data/rag.db",
      indexName: "base_institucional",
      documentsDir: "./data/documentos",
      chunkSize: 1000,
      chunkOverlap: 150,
      fetchTimeoutMs: 15_000,
    });
  });

  it("trata variável vazia como ausente", () => {
    expect(loadRagConfig({ RAG_CHUNK_SIZE: "" }).chunkSize).toBe(1000);
  });

  it("rejeita sobreposição maior ou igual ao tamanho do chunk", () => {
    expect(() => loadRagConfig({ RAG_CHUNK_SIZE: "100", RAG_CHUNK_OVERLAP: "100" })).toThrow(
      /RAG_CHUNK_OVERLAP: deve ser menor que RAG_CHUNK_SIZE/,
    );
  });

  it("rejeita nome de índice inválido", () => {
    expect(() => loadRagConfig({ RAG_INDEX_NAME: "base-institucional" })).toThrow(
      /RAG_INDEX_NAME/,
    );
  });
});
