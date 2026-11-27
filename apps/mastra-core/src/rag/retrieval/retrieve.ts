import { z } from "zod";
import type { Embedder } from "../ingestion/embed.js";
import type { KnowledgeStore, StoredMatch } from "../knowledge-store.js";
import { toCitation, uniqueCitations, type Citation } from "./citation.js";
import { keywordScores } from "./lexical.js";
import { embedQuery, normalizeQuery, RetrievalError } from "./query.js";

// Metadados que um trecho precisa ter para que a origem seja comprovada. Trecho fora
// desse formato é descartado: a fonte nunca é completada ou inventada
const storedChunkSchema = z
  .object({
    text: z.string().trim().min(1),
    sourceId: z.string().trim().min(1),
    origin: z.enum(["site", "documento"]),
    type: z.enum(["html", "pdf", "docx", "doc"]),
    title: z.string().trim().min(1),
    page: z.number().int().positive().optional(),
    chunkIndex: z.number().int().min(0).optional(),
    totalChunks: z.number().int().positive().optional(),
    collectedAt: z.string().optional(),
    contentHash: z.string().optional(),
  })
  .refine((chunk) => chunk.origin !== "site" || /^https?:\/\//.test(chunk.sourceId), {
    message: "fonte do site sem URL",
  });

// Metadados de origem salvos na ingestão, sem o texto (que fica no próprio trecho)
export type RetrievedSource = Omit<z.infer<typeof storedChunkSchema>, "text">;

export type RetrievedChunk = {
  // Texto do trecho, como foi salvo na ingestão
  text: string;
  score: number;
  source: RetrievedSource;
  citation: Citation;
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
  store: Pick<KnowledgeStore, "search" | "searchInSource">;
  topK: number;
  minScore: number;
  queryMaxChars: number;
  // Página com até esse número de trechos entra inteira quando um deles é encontrado
  // (0 desliga). Numa página pequena, o dado pedido (endereço, telefone) costuma estar
  // num trecho pouco parecido com a pergunta, como "Localização" para "endereço"
  expandSourcesUpTo?: number;
  // Peso do reforço por palavras-chave na ordem dos trechos (0 desliga). Ligado, a busca
  // semântica traz mais candidatos e as palavras raras da pergunta reordenam os topK
  lexicalWeight?: number;
};

// Candidatos buscados para o reforço por palavras-chave escolher os topK
const LEXICAL_CANDIDATES = 60;

export function createRetriever({
  embed,
  store,
  topK,
  minScore,
  queryMaxChars,
  expandSourcesUpTo = 0,
  lexicalWeight = 0,
}: RetrieverDeps) {
  return async function retrieve(text: string): Promise<RetrievalResult> {
    const query = normalizeQuery(text, queryMaxChars);
    const vector = await embedQuery(query, embed);

    let matches: StoredMatch[];
    try {
      matches = await store.search(vector, lexicalWeight > 0 ? Math.max(topK, LEXICAL_CANDIDATES) : topK);
    } catch (error) {
      throw new RetrievalError("Não foi possível consultar a base de conhecimento.", "unavailable", {
        cause: error,
      });
    }

    // A busca vetorial sempre devolve os mais próximos, mesmo sem relação com a pergunta.
    // Só há resposta na base se algum trecho passa do mínimo; sem isso, nada é devolvido
    if (!matches.some((match) => match.score >= minScore)) {
      return { query, found: false, chunks: [], sources: [] };
    }
    const found = selectChunks(query, matches, { topK, minScore, lexicalWeight });
    const chunks = await expandSmallSources(found, vector, store, expandSourcesUpTo);
    const sources = uniqueCitations(chunks.map((chunk) => chunk.citation));

    return { query, found: chunks.length > 0, chunks, sources };
  };
}

// Trecho abaixo do mínimo, mas próximo dele, entra quando traz a maior parte das palavras-chave
// da pergunta (ex.: "HORÁRIOS DE FUNCIONAMENTO" da biblioteca para "horário da biblioteca")
const LEXICAL_RESCUE_MARGIN = 0.08;
const LEXICAL_RESCUE_MIN_MATCH = 0.5;

function selectChunks(
  query: string,
  matches: StoredMatch[],
  options: { topK: number; minScore: number; lexicalWeight: number },
): RetrievedChunk[] {
  const { topK, minScore, lexicalWeight } = options;
  const candidates = matches
    .filter((match) => match.score >= minScore - (lexicalWeight > 0 ? LEXICAL_RESCUE_MARGIN : 0))
    .flatMap((match) => toChunk(match) ?? []);
  if (lexicalWeight <= 0) return candidates.filter((chunk) => chunk.score >= minScore).slice(0, topK);

  const lexical = keywordScores(query, candidates.map((chunk) => chunk.text));
  return candidates
    .map((chunk, index) => ({ chunk, lexical: lexical[index]! }))
    .filter(({ chunk, lexical }) => chunk.score >= minScore || lexical >= LEXICAL_RESCUE_MIN_MATCH)
    .sort((a, b) => b.chunk.score + lexicalWeight * b.lexical - (a.chunk.score + lexicalWeight * a.lexical))
    .slice(0, topK)
    .map(({ chunk }) => chunk);
}

async function expandSmallSources(
  chunks: RetrievedChunk[],
  vector: number[],
  store: Pick<KnowledgeStore, "searchInSource">,
  upTo: number,
): Promise<RetrievedChunk[]> {
  if (upTo <= 0 || !store.searchInSource) return chunks;

  const expanded = [...chunks];
  const expandedSources = new Set<string>();

  for (const chunk of chunks) {
    const { sourceId, totalChunks } = chunk.source;
    if (!totalChunks || totalChunks > upTo || expandedSources.has(sourceId)) continue;
    expandedSources.add(sourceId);

    const present = expanded.filter((item) => item.source.sourceId === sourceId).length;
    if (present >= totalChunks) continue;

    let siblings: StoredMatch[];
    try {
      siblings = await store.searchInSource(vector, sourceId, totalChunks);
    } catch {
      // A expansão é um extra: sem ela a resposta segue com os trechos já encontrados
      continue;
    }

    const known = new Set(expanded.map(chunkKey));
    const extra = siblings
      .flatMap((match) => toChunk(match) ?? [])
      .filter((item) => item.source.sourceId === sourceId && !known.has(chunkKey(item)))
      .sort((a, b) => (a.source.chunkIndex ?? 0) - (b.source.chunkIndex ?? 0));

    // Os trechos da mesma página entram logo depois do último já encontrado dela
    let lastIndex = -1;
    expanded.forEach((item, index) => {
      if (item.source.sourceId === sourceId) lastIndex = index;
    });
    expanded.splice(lastIndex + 1, 0, ...extra);
  }

  return expanded;
}

function chunkKey(chunk: RetrievedChunk): string {
  return `${chunk.source.sourceId}#${chunk.source.chunkIndex ?? chunk.text}`;
}

function toChunk(match: StoredMatch): RetrievedChunk | undefined {
  const parsed = storedChunkSchema.safeParse(match.metadata);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || parsed.error.issues[0]?.message;
    console.warn(`[rag] trecho ${match.id} descartado: metadados de origem inválidos (${field})`);
    return undefined;
  }

  const { text, ...source } = parsed.data;
  return { text, score: match.score, source, citation: toCitation(source) };
}
