import type { Embedder } from "../ingestion/embed.js";
import type { ChunkMetadata } from "../ingestion/metadata.js";
import type { KnowledgeStore, StoredMatch } from "../vector-store.js";
import { toCitation, uniqueCitations, type Citation } from "./citation.js";
import { embedQuery, normalizeQuery, RetrievalError } from "./query.js";

// Metadados de origem salvos na ingestão, sem o texto (que fica no próprio trecho)
export type RetrievedSource = Partial<Omit<ChunkMetadata, "text">>;

export type RetrievedChunk = {
  // Texto do trecho, como foi salvo na ingestão
  text: string;
  score: number;
  source: RetrievedSource;
  // Só existe quando os metadados identificam a origem (id, tipo de origem e título)
  citation?: Citation;
};

export type RetrievalResult = {
  query: string;
  // false quando nenhum trecho atinge a similaridade mínima (ou a base está vazia):
  // nesse caso o agente deve dizer que não tem a informação, sem inventar
  found: boolean;
  chunks: RetrievedChunk[];
  // Fontes dos trechos, sem repetição, para citar na resposta
  sources: Citation[];
};

type RetrieverDeps = {
  // Embedder criado com o uso "query"
  embed: Embedder;
  store: Pick<KnowledgeStore, "search">;
  topK: number;
  minScore: number;
  queryMaxChars: number;
};

export function createRetriever({ embed, store, topK, minScore, queryMaxChars }: RetrieverDeps) {
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

    // A busca vetorial sempre devolve os mais próximos, mesmo sem relação com a pergunta;
    // abaixo do mínimo o trecho é descartado
    const chunks = matches.filter((match) => match.score >= minScore).map(toChunk);
    const sources = uniqueCitations(chunks.flatMap((chunk) => chunk.citation ?? []));

    return { query, found: chunks.length > 0, chunks, sources };
  };
}

function toChunk(match: StoredMatch): RetrievedChunk {
  const { text, ...metadata } = match.metadata;
  const source = metadata as RetrievedSource;
  const { sourceId, origin, title, page } = source;

  const identified =
    typeof sourceId === "string" &&
    (origin === "site" || origin === "documento") &&
    typeof title === "string";

  return {
    text: typeof text === "string" ? text : "",
    score: match.score,
    source,
    ...(identified ? { citation: toCitation({ sourceId, origin, title, page }) } : {}),
  };
}
