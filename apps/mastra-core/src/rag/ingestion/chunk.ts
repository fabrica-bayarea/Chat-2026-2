import { MDocument } from "@mastra/rag";
import type { ExtractedDocument } from "./extract.js";

export type TextChunk = {
  text: string;
  page?: number;
};

export async function chunkDocument(
  doc: ExtractedDocument,
  options: { size: number; overlap: number },
): Promise<TextChunk[]> {
  const chunks: TextChunk[] = [];

  // Cada parte é dividida separadamente para que um chunk nunca misture duas páginas do PDF
  for (const part of doc.parts) {
    const pieces = await MDocument.fromText(part.text).chunk({
      strategy: "recursive",
      maxSize: options.size,
      overlap: options.overlap,
      // Prioriza parágrafo, depois linha, depois frase
      separators: ["\n\n", "\n", ". ", " "],
    });

    for (const piece of pieces) {
      const text = piece.text.trim();
      if (text) chunks.push({ text, page: part.page });
    }
  }

  return chunks;
}
