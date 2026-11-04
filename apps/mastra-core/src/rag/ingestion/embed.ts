import { embedMany } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { RagConfig } from "../../config/rag.config.js";

export type Embedder = (texts: string[]) => Promise<number[][]>;

export function createEmbedder(
  config: Pick<RagConfig, "ollamaBaseUrl" | "embeddingModel">,
): Embedder {
  const ollama = createOllama({ baseURL: config.ollamaBaseUrl });
  const model = ollama.textEmbeddingModel(config.embeddingModel);

  return async (texts) => {
    if (texts.length === 0) return [];
    // O embedMany já divide em lotes conforme o limite do provider
    const { embeddings } = await embedMany({ model, values: texts, maxParallelCalls: 2 });
    return embeddings;
  };
}
