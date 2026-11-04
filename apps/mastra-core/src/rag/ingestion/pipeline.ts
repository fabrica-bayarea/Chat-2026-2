import type { RagConfig } from "../../config/rag.config.js";
import type { Source } from "../sources.js";
import type { KnowledgeStore } from "../vector-store.js";
import { chunkDocument } from "./chunk.js";
import { collectSource } from "./collect.js";
import type { Embedder } from "./embed.js";
import { extractText } from "./extract.js";
import { prepareChunks } from "./metadata.js";
import { normalizeDocument } from "./normalize.js";

export type IngestionSummary = {
  sources: number;
  chunks: number;
};

type IngestionDeps = {
  sources: Source[];
  embed: Embedder;
  store: KnowledgeStore;
};

export async function runIngestion(
  config: Pick<RagConfig, "chunkSize" | "chunkOverlap" | "fetchTimeoutMs">,
  { sources, embed, store }: IngestionDeps,
): Promise<IngestionSummary> {
  await store.reset();
  let totalChunks = 0;

  for (const source of sources) {
    const collected = await collectSource(source, { timeoutMs: config.fetchTimeoutMs });
    const doc = normalizeDocument(await extractText(collected));
    const chunks = await chunkDocument(doc, {
      size: config.chunkSize,
      overlap: config.chunkOverlap,
    });
    const prepared = prepareChunks(doc, chunks);
    const vectors = await embed(prepared.map((chunk) => chunk.metadata.text));

    await store.saveSource(source.id, prepared, vectors);
    totalChunks += prepared.length;
    console.log(`[rag] ${source.id}: ${prepared.length} chunks`);
  }

  return { sources: sources.length, chunks: totalChunks };
}
