import { embedMany } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { RagConfig } from "../../config/rag.config.js";

export type Embedder = (texts: string[]) => Promise<number[][]>;

// "document" para os chunks salvos na base, "query" para a pergunta na hora da busca
export type EmbeddingUsage = "document" | "query";

// O nomic-embed-text foi treinado com prefixos de tarefa e a busca piora sem eles.
// Documento e pergunta precisam usar o prefixo correspondente
const TASK_PREFIXES: Record<string, Record<EmbeddingUsage, string>> = {
  "nomic-embed-text": { document: "search_document: ", query: "search_query: " },
};

export function createEmbedder(
  config: Pick<RagConfig, "ollamaBaseUrl" | "embeddingModel">,
  usage: EmbeddingUsage = "document",
): Embedder {
  const ollama = createOllama({ baseURL: config.ollamaBaseUrl });
  const model = ollama.textEmbeddingModel(config.embeddingModel);
  // Ignora a tag do Ollama: "nomic-embed-text:latest" usa os mesmos prefixos
  const prefix = TASK_PREFIXES[config.embeddingModel.split(":")[0]!]?.[usage] ?? "";

  return async (texts) => {
    if (texts.length === 0) return [];
    // O embedMany já divide em lotes conforme o limite do provider
    const { embeddings } = await embedMany({
      model,
      values: texts.map((text) => prefix + text),
      maxParallelCalls: 2,
    });
    return embeddings;
  };
}
