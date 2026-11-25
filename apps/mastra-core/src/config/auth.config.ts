import { z } from "zod";

const envSchema = z.object({
  // Endereço do apps/backend, que sabe de quem é o cookie da sessão. Sem ele, todo mundo é visitante.
  AUTH_API_URL: z.url().optional(),
  AUTH_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
});

export type AuthConfig = {
  apiUrl?: string;
  timeoutMs: number;
};

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ""),
  );

  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuração de autenticação inválida:\n${details}`);
  }

  return {
    apiUrl: parsed.data.AUTH_API_URL?.replace(/\/+$/, ""),
    timeoutMs: parsed.data.AUTH_TIMEOUT_MS,
  };
}
