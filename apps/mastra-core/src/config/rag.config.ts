import { z } from "zod";

const envSchema = z
  .object({
    OLLAMA_BASE_URL: z.url().default("http://localhost:11434/api"),
    RAG_EMBEDDING_MODEL: z.string().trim().min(1).default("nomic-embed-text"),
    RAG_VECTOR_DB_URL: z.string().trim().min(1).default("file:./data/rag.db"),
    RAG_INDEX_NAME: z
      .string()
      .regex(/^[a-z_][a-z0-9_]*$/, "use apenas letras minúsculas, números e _")
      .default("base_institucional"),
    RAG_DOCUMENTS_DIR: z.string().trim().min(1).default("./data/documentos"),
    RAG_CHUNK_SIZE: z.coerce.number().int().positive().default(1000),
    RAG_CHUNK_OVERLAP: z.coerce.number().int().min(0).default(150),
    RAG_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    RAG_QUERY_MAX_CHARS: z.coerce.number().int().positive().default(1000),
    RAG_TOP_K: z.coerce.number().int().positive().max(50).default(5),
    RAG_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.69),
    RAG_EXPAND_SOURCE_CHUNKS: z.coerce.number().int().min(0).max(20).default(3),
    RAG_LEXICAL_WEIGHT: z.coerce.number().min(0).max(1).default(0.15),
  })
  .refine((env) => env.RAG_CHUNK_OVERLAP < env.RAG_CHUNK_SIZE, {
    path: ["RAG_CHUNK_OVERLAP"],
    message: "deve ser menor que RAG_CHUNK_SIZE",
  });

export type RagConfig = {
  ollamaBaseUrl: string;
  embeddingModel: string;
  vectorDbUrl: string;
  indexName: string;
  documentsDir: string;
  chunkSize: number;
  chunkOverlap: number;
  fetchTimeoutMs: number;
  queryMaxChars: number;
  topK: number;
  minScore: number;
  // Página com até esse número de trechos entra inteira na resposta (0 desliga)
  expandSourceChunks: number;
  // Peso do reforço por palavras-chave raras na ordem dos trechos (0 desliga)
  lexicalWeight: number;
};

export function loadRagConfig(env: NodeJS.ProcessEnv = process.env): RagConfig {
  // Variável vazia é tratada como ausente
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ""),
  );

  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuração do RAG inválida:\n${details}`);
  }

  const d = parsed.data;
  return {
    ollamaBaseUrl: d.OLLAMA_BASE_URL,
    embeddingModel: d.RAG_EMBEDDING_MODEL,
    vectorDbUrl: d.RAG_VECTOR_DB_URL,
    indexName: d.RAG_INDEX_NAME,
    documentsDir: d.RAG_DOCUMENTS_DIR,
    chunkSize: d.RAG_CHUNK_SIZE,
    chunkOverlap: d.RAG_CHUNK_OVERLAP,
    fetchTimeoutMs: d.RAG_FETCH_TIMEOUT_MS,
    queryMaxChars: d.RAG_QUERY_MAX_CHARS,
    topK: d.RAG_TOP_K,
    minScore: d.RAG_MIN_SCORE,
    expandSourceChunks: d.RAG_EXPAND_SOURCE_CHUNKS,
    lexicalWeight: d.RAG_LEXICAL_WEIGHT,
  };
}
