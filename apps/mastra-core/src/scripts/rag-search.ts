import { loadRagConfig } from "../config/rag.config.js";
import { createEmbedder } from "../rag/ingestion/embed.js";
import { createLibSQLKnowledgeStore } from "../rag/libsql-store.js";
import { RetrievalError } from "../rag/retrieval/query.js";
import { createRetriever } from "../rag/retrieval/retrieve.js";

async function main() {
  const question = process.argv.slice(2).join(" ");
  if (!question.trim()) {
    console.error('Uso: pnpm --filter mastra-core rag:search "sua pergunta"');
    process.exit(1);
  }

  const config = loadRagConfig();
  const retrieve = createRetriever({
    embed: createEmbedder(config, "query"),
    store: await createLibSQLKnowledgeStore(config),
    topK: config.topK,
    minScore: config.minScore,
    queryMaxChars: config.queryMaxChars,
  });

  let result;
  try {
    result = await retrieve(question);
  } catch (error) {
    if (!(error instanceof RetrievalError)) throw error;
    const hint =
      error.kind === "unavailable"
        ? ` Verifique se o Ollama está rodando em ${config.ollamaBaseUrl} e se a ingestão foi executada.`
        : "";
    console.error(`[rag] ${error.message}${hint}`);
    process.exit(1);
  }

  if (!result.found) {
    console.log(
      `[rag] nenhum trecho relevante para "${result.query}" (similaridade mínima ${config.minScore}).`,
    );
    return;
  }

  const total = result.chunks.length;
  console.log(`[rag] ${total} ${total === 1 ? "trecho" : "trechos"} para "${result.query}":\n`);
  for (const chunk of result.chunks) {
    console.log(`${chunk.score.toFixed(3)}  ${chunk.citation.label}`);
    if (chunk.citation.url) console.log(`       ${chunk.citation.url}`);
    console.log(`       ${chunk.text.replace(/\s+/g, " ").slice(0, 200)}…\n`);
  }

  console.log("Fontes:");
  for (const source of result.sources) console.log(`- ${source.label}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
