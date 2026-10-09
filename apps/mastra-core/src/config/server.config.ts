import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  CHAT_MAX_BODY_BYTES: z.coerce.number().int().positive().default(100_000),
  CHAT_MAX_MESSAGES: z.coerce.number().int().positive().default(50),
  CHAT_MAX_MESSAGE_CHARS: z.coerce.number().int().positive().default(4000),
});

export type ServerConfig = {
  port: number;
  corsOrigins: string[];
  maxBodyBytes: number;
  maxMessages: number;
  maxMessageChars: number;
};

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  // Variável vazia é tratada como ausente
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ""),
  );

  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuração do servidor inválida:\n${details}`);
  }

  const d = parsed.data;
  return {
    port: d.PORT,
    corsOrigins: d.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
    maxBodyBytes: d.CHAT_MAX_BODY_BYTES,
    maxMessages: d.CHAT_MAX_MESSAGES,
    maxMessageChars: d.CHAT_MAX_MESSAGE_CHARS,
  };
}