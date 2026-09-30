import { z } from "zod";

const envSchema = z.object({
  CONTEXT_HISTORY_SIZE: z.coerce.number().int().positive().default(10),
});

export type ContextConfig = {
  historySize: number;
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

  return { historySize: parsed.data.CONTEXT_HISTORY_SIZE };
}