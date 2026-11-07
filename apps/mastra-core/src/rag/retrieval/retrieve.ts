import type { Embedder } from "../ingestion/embed.js";
import type { KnowledgeStore, StoredMatch } from "../vector-store.js";
import { embedQuery, normalizeQuery, RetrievalError } from "./query.js";

export type RetrievedChunk = {
  // Texto do trecho, como foi salvo na ingestão
  text: string;
  score: number;
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
  const text = typeof match.metadata.text === "string" ? match.metadata.text : "";
  return { text, score: match.score };
}
