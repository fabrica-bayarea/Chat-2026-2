import { loadRagConfig } from "../config/rag.config.js";
import { listDocumentSources } from "../rag/ingestion/collect.js";
import { createEmbedder } from "../rag/ingestion/embed.js";
import { runIngestion } from "../rag/ingestion/pipeline.js";
import { siteSources } from "../rag/sources.js";
import { createKnowledgeStore } from "../rag/vector-store.js";

async function main() {
  const config = loadRagConfig();
  const documents = await listDocumentSources(config.documentsDir);
  const sources = [...siteSources, ...documents];

  console.log(
    `[rag] iniciando ingestão: ${siteSources.length} páginas e ${documents.length} documentos`,
  );

  const summary = await runIngestion(config, {
    sources,
    embed: createEmbedder(config),
    store: await createKnowledgeStore(config),
  });

  console.log(
    `[rag] ingestão concluída: ${summary.chunks} chunks de ${summary.sources} fontes salvos em ${config.vectorDbUrl} (índice ${config.indexName})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
