import type { Context } from "hono";
import { describeError } from "../chat.js";

export type ChatErrorCode =
  | "INVALID_REQUEST"
  | "LLM_UNAVAILABLE"
  | "MODEL_NOT_FOUND"
  | "TIMEOUT"
  | "INTERNAL_ERROR";

export type StreamErrorCode = Exclude<ChatErrorCode, "INVALID_REQUEST">;

// Resposta 400 no formato { error, code } definido na issue
export function invalidRequest(c: Context, message: string) {
  const code: ChatErrorCode = "INVALID_REQUEST";
  return c.json({ error: message, code }, 400);
}

// Textos exibidos ao usuário no evento ERROR: pt-BR e sem detalhes internos
export const STREAM_ERROR_MESSAGES: Record<StreamErrorCode, string> = {
  LLM_UNAVAILABLE: "O assistente está temporariamente indisponível. Tente novamente em instantes.",
  MODEL_NOT_FOUND: "O assistente não está disponível no momento. Tente novamente mais tarde.",
  TIMEOUT: "A resposta demorou mais do que o esperado. Tente novamente.",
  INTERNAL_ERROR: "Ocorreu um erro inesperado ao gerar a resposta. Tente novamente.",
};

export function classifyStreamError(error: unknown, timeoutSignal?: AbortSignal): StreamErrorCode {
  if (timeoutSignal?.aborted) return "TIMEOUT";

  const text = describeError(error);
  if (text.includes("timeout") || text.includes("timed out")) return "TIMEOUT";
  if (
    text.includes("econnrefused") ||
    text.includes("fetch failed") ||
    text.includes("cannot connect")
  ) {
    return "LLM_UNAVAILABLE";
  }
  if (text.includes("not found") || text.includes("404")) return "MODEL_NOT_FOUND";
  return "INTERNAL_ERROR";
}