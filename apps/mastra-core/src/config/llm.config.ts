import { z } from "zod";

const envSchema = z.object({
  OLLAMA_BASE_URL: z.url().default("http://localhost:11434/api"),
  LLM_MODEL: z
    .string({ error: "LLM_MODEL é obrigatória (nome de um modelo baixado no Ollama)" })
    .trim()
    .min(1, "LLM_MODEL não pode ser vazia"),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  LLM_NUM_CTX: z.coerce.number().int().min(1024).default(8192),
});

export type LlmConfig = {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  numCtx: number;
};

export function loadLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ""),
  );

  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuração do LLM inválida:\n${details}`);
  }

  const d = parsed.data;
  return {
    baseUrl: d.OLLAMA_BASE_URL,
    model: d.LLM_MODEL,
    temperature: d.LLM_TEMPERATURE,
    maxTokens: d.LLM_MAX_TOKENS,
    timeoutMs: d.LLM_TIMEOUT_MS,
    numCtx: d.LLM_NUM_CTX,
  };
}

// Limites que o Ollama realmente respeita.
// O provider manda temperature e max_output_tokens soltos no corpo, e o /api/chat do Ollama
// ignora esses campos: o modelo gerava sem limite. Por isso os limites vão em "options".
// - num_predict: máximo de tokens da resposta (LLM_MAX_TOKENS)
// - num_ctx: tamanho da janela do modelo (LLM_NUM_CTX). Sem ele, o Ollama usa o padrão dele
//   e, quando o prompt não cabe, joga fora mensagens antigas sem avisar. O padrão de 8192
//   cabe instruções, histórico (CONTEXT_MAX_CHARS), trechos da base e a resposta.
export function ollamaProviderOptions(config: LlmConfig) {
  return {
    ollama: {
      options: {
        num_ctx: config.numCtx,
        num_predict: config.maxTokens,
        temperature: config.temperature,
      },
    },
  };
}
