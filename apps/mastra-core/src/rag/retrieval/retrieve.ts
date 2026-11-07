import type { Embedder } from "../ingestion/embed.js";
import type { KnowledgeStore, StoredMatch } from "../vector-store.js";
import { embedQuery, normalizeQuery, RetrievalError } from "./query.js";

export type RetrievalResult = {
  query: string;
  matches: StoredMatch[];
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

    return { query, matches };
  };
}
