import { createHash } from "node:crypto";
import type { SourceOrigin, SourceType } from "../sources.js";
import type { TextChunk } from "./chunk.js";
import type { ExtractedDocument } from "./extract.js";

export type ChunkMetadata = {
  // O texto fica nos metadados para ser devolvido junto com o resultado da busca
  text: string;
  // URL da página ou caminho do documento relativo à pasta de documentos
  sourceId: string;
  origin: SourceOrigin;
  type: SourceType;
  title: string;
  page?: number;
  chunkIndex: number;
  totalChunks: number;
  collectedAt: string;
  contentHash: string;
};

export type PreparedChunk = {
  id: string;
  metadata: ChunkMetadata;
};

export function prepareChunks(doc: ExtractedDocument, chunks: TextChunk[]): PreparedChunk[] {
  const { source, collectedAt } = doc.collected;

  return chunks.map((chunk, index) => ({
    // Id determinístico: reprocessar a mesma fonte substitui os chunks em vez de duplicar
    id: hash(`${source.id}#${index}`),
    metadata: {
      text: chunk.text,
      sourceId: source.id,
      origin: source.origin,
      type: source.type,
      title: doc.title,
      ...(chunk.page !== undefined ? { page: chunk.page } : {}),
      chunkIndex: index,
      totalChunks: chunks.length,
      collectedAt,
      contentHash: hash(chunk.text),
    },
  }));
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
