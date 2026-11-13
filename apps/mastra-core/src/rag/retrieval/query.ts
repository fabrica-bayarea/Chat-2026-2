import type { Embedder } from "../ingestion/embed.js";

export class RetrievalError extends Error {
  constructor(
    message: string,
    readonly kind: "invalid_query" | "unavailable",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "RetrievalError";
  }
}

export function normalizeQuery(text: string, maxChars: number): string {
  const query = text.normalize("NFC").replace(/\s+/g, " ").trim();

  if (!query) {
    throw new RetrievalError("A consulta está vazia.", "invalid_query");
  }
  if (query.length > maxChars) {
    throw new RetrievalError(
      `A consulta excede o limite de ${maxChars} caracteres.`,
      "invalid_query",
    );
  }
  return query;
}

// O embedder precisa ser criado com o uso "query" para aplicar o prefixo de pergunta
// do modelo; a base foi gerada com o prefixo de documento
export async function embedQuery(query: string, embed: Embedder): Promise<number[]> {
  try {
    const [vector] = await embed([query]);
    if (!vector) throw new Error("o modelo não devolveu o embedding da consulta");
    return vector;
  } catch (error) {
    throw new RetrievalError("Não foi possível gerar o embedding da consulta.", "unavailable", {
      cause: error,
    });
  }
}
