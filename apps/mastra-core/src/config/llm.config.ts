import { z } from "zod";

const envSchema = z.object({
  OLLAMA_BASE_URL: z.url().default("http://localhost:11434/api"),
  LLM_MODEL: z
    .string({ error: "LLM_MODEL é obrigatória (nome de um modelo baixado no Ollama)" })
    .trim()
    .min(1, "LLM_MODEL não pode ser vazia"),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

export type LlmConfig = {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

export function loadLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  // Variável vazia (ex.: "LLM_MAX_TOKENS=") é tratada como ausente
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
  };
}