import type { RagConfig } from "../../config/rag.config.js";
import type { Source } from "../sources.js";
import type { KnowledgeStore } from "../knowledge-store.js";
import { chunkDocument } from "./chunk.js";
import { collectSource } from "./collect.js";
import type { Embedder } from "./embed.js";
import { IngestionError, runStage, type IngestionStage } from "./errors.js";
import { extractText } from "./extract.js";
import { prepareChunks } from "./metadata.js";
import { normalizeDocument } from "./normalize.js";

export type IngestionFailure = {
  sourceId: string;
  stage: IngestionStage;
  message: string;
};

export type IngestionSummary = {
  sources: number;
  processed: number;
  chunks: number;
  failures: IngestionFailure[];
};

// A ingestão só grava; depender apenas destes métodos facilita trocar a base vetorial
export type IngestionStore = Pick<KnowledgeStore, "reset" | "saveSource">;

type IngestionConfig = Pick<RagConfig, "chunkSize" | "chunkOverlap" | "fetchTimeoutMs">;

type IngestionDeps = {
  sources: Source[];
  embed: Embedder;
  store: IngestionStore;
};

export async function runIngestion(
  config: IngestionConfig,
  { sources, embed, store }: IngestionDeps,
): Promise<IngestionSummary> {
  // Testa o modelo de embeddings antes de apagar o índice: sem o Ollama no ar,
  // a execução pararia no meio e a base anterior já teria sido perdida
  await runStage("embeddings", () => embed(["teste de conexão"]));
  await runStage("armazenamento", () => store.reset());

  const summary: IngestionSummary = {
    sources: sources.length,
    processed: 0,
    chunks: 0,
    failures: [],
  };

  for (const source of sources) {
    try {
      const chunks = await ingestSource(source, config, { embed, store });
      summary.processed += 1;
      summary.chunks += chunks;
      console.log(`[rag] ${source.id}: ${chunks} chunks`);
    } catch (error) {
      if (!(error instanceof IngestionError)) throw error;
      // Erro ao gravar não é da fonte: continuar deixaria a base pela metade
      if (error.stage === "armazenamento") throw error;

      summary.failures.push({ sourceId: source.id, stage: error.stage, message: error.message });
      console.error(`[rag] falha em ${source.id} (${error.stage}): ${error.message}`);
    }
  }

  return summary;
}

async function ingestSource(
  source: Source,
  config: IngestionConfig,
  { embed, store }: Omit<IngestionDeps, "sources">,
): Promise<number> {
  const collected = await runStage("coleta", () =>
    collectSource(source, { timeoutMs: config.fetchTimeoutMs }),
  );
  const doc = normalizeDocument(await runStage("extracao", () => extractText(collected)));

  if (doc.parts.length === 0) {
    throw new IngestionError(
      "nenhum texto extraível (o arquivo pode ser uma imagem ou um PDF digitalizado)",
      "extracao",
    );
  }

  const chunks = await chunkDocument(doc, {
    size: config.chunkSize,
    overlap: config.chunkOverlap,
  });
  const prepared = prepareChunks(doc, chunks);
  const vectors = await runStage("embeddings", () =>
    embed(prepared.map((chunk) => chunk.metadata.text)),
  );

  await runStage("armazenamento", () => store.saveSource(source.id, prepared, vectors));
  return prepared.length;
}
