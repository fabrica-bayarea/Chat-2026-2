import { loadRagConfig, type RagConfig } from "../config/rag.config.js";
import { listDocumentSources } from "../rag/ingestion/collect.js";
import { createEmbedder } from "../rag/ingestion/embed.js";
import { IngestionError } from "../rag/ingestion/errors.js";
import { runIngestion } from "../rag/ingestion/pipeline.js";
import { siteSources, type Source } from "../rag/sources.js";
import { createKnowledgeStore } from "../rag/vector-store.js";

async function main() {
  const config = loadRagConfig();
  const documents = await loadDocuments(config.documentsDir);
  const sources = [...siteSources, ...documents];

  console.log(
    `[rag] iniciando ingestão: ${siteSources.length} páginas e ${documents.length} documentos`,
  );

  let summary;
  try {
    summary = await runIngestion(config, {
      sources,
      embed: createEmbedder(config),
      store: await createKnowledgeStore(config),
    });
  } catch (error) {
    console.error(`[rag] ingestão interrompida: ${explain(error, config)}`);
    process.exit(1);
  }

  console.log(
    `[rag] ingestão concluída: ${summary.processed} de ${summary.sources} fontes, ${summary.chunks} chunks salvos em ${config.vectorDbUrl} (índice ${config.indexName})`,
  );

  if (summary.failures.length > 0) {
    console.warn(`[rag] ${summary.failures.length} fontes não foram processadas:`);
    for (const failure of summary.failures) {
      console.warn(`- ${failure.sourceId} (${failure.stage}): ${failure.message}`);
    }
  }

  if (summary.processed === 0) process.exit(1);
}

async function loadDocuments(dir: string): Promise<Source[]> {
  try {
    return await listDocumentSources(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.warn(`[rag] pasta de documentos ${dir} não encontrada; seguindo só com o site`);
    return [];
  }
}

function explain(error: unknown, config: RagConfig): string {
  if (!(error instanceof IngestionError)) return String(error);

  if (error.stage === "embeddings") {
    return `${error.message}. Verifique se o Ollama está rodando em ${config.ollamaBaseUrl} e se o modelo foi baixado (\`ollama pull ${config.embeddingModel}\`).`;
  }
  return `${error.stage}: ${error.message}`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
