import type { PreparedChunk } from "./ingestion/metadata.js";

export type StoredMatch = {
  id: string;
  // Similaridade de cosseno com a consulta (quanto maior, mais parecido)
  score: number;
  metadata: Record<string, unknown>;
};

// Contrato da base vetorial. A ingestão e a recuperação dependem só dele; a escolha da
// implementação (hoje LibSQL, em libsql-store.ts) fica nos scripts. Para trocar a base
// (ex.: PgVector), basta uma nova implementação destes três métodos
export type KnowledgeStore = {
  // Apaga o conteúdo atual antes de uma nova ingestão completa
  reset(): Promise<void>;
  saveSource(sourceId: string, chunks: PreparedChunk[], vectors: number[][]): Promise<void>;
  // Devolve até topK trechos mais próximos; base vazia devolve lista vazia
  search(vector: number[], topK: number): Promise<StoredMatch[]>;
};
