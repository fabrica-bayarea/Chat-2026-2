import { z } from "zod";

const envSchema = z.object({
  CONTEXT_HISTORY_SIZE: z.coerce.number().int().positive().default(10),
  CONTEXT_MAX_CHARS: z.coerce.number().int().positive().default(6000),
});

export type ContextConfig = {
  // Máximo de mensagens da conversa que vão para o modelo (as mais recentes)
  historySize: number;
  // Máximo de caracteres somados dessas mensagens (~4 caracteres por token)
  maxChars: number;
};

export function loadContextConfig(env: NodeJS.ProcessEnv = process.env): ContextConfig {
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ""),
  );

  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuração de contexto inválida:\n${details}`);
  }

  return {
    historySize: parsed.data.CONTEXT_HISTORY_SIZE,
    maxChars: parsed.data.CONTEXT_MAX_CHARS,
  };
}