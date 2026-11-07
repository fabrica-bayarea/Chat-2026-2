import type { Embedder } from "../ingestion/embed.js";
import type { ChunkMetadata } from "../ingestion/metadata.js";
import type { KnowledgeStore, StoredMatch } from "../vector-store.js";
import { embedQuery, normalizeQuery, RetrievalError } from "./query.js";

// Metadados de origem salvos na ingestão, sem o texto (que fica no próprio trecho)
export type RetrievedSource = Partial<Omit<ChunkMetadata, "text">>;

export type RetrievedChunk = {
  // Texto do trecho, como foi salvo na ingestão
  text: string;
  score: number;
  source: RetrievedSource;
};

export type RetrievalResult = {
  query: string;
  chunks: RetrievedChunk[];
};

type RetrieverDeps = {
  // Embedder criado com o uso "query"
  embed: Embedder;
  store: Pick<KnowledgeStore, "search">;
  topK: number;
  queryMaxChars: number;
};

export function createRetriever({ embed, store, topK, queryMaxChars }: RetrieverDeps) {
  return async function retrieve(text: string): Promise<RetrievalResult> {
    const query = normalizeQuery(text, queryMaxChars);
    const vector = await embedQuery(query, embed);

    let matches: StoredMatch[];
    try {
      matches = await store.search(vector, topK);
    } catch (error) {
      throw new RetrievalError("Não foi possível consultar a base de conhecimento.", "unavailable", {
        cause: error,
      });
    }

    return { query, chunks: matches.map(toChunk) };
  };
}

function toChunk(match: StoredMatch): RetrievedChunk {
  const { text, ...source } = match.metadata;
  return {
    text: typeof text === "string" ? text : "",
    score: match.score,
    source: source as RetrievedSource,
  };
}
