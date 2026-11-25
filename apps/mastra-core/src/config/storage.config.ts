import { z } from "zod";

const envSchema = z.object({
  // Histórico confiável das conversas (servidor). Arquivo local por padrão.
  CHAT_HISTORY_DB_URL: z.string().trim().min(1).default("file:./data/chat-history.db"),
  // Armazenamento interno do Mastra (execuções, rastros). Antes ficava só em memória.
  MASTRA_STORAGE_URL: z.string().trim().min(1).default("file:./data/mastra.db"),
});

export type StorageConfig = {
  chatHistoryDbUrl: string;
  mastraStorageUrl: string;
};

export function loadStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ""),
  );
  const parsed = envSchema.parse(cleaned);
  return {
    chatHistoryDbUrl: parsed.CHAT_HISTORY_DB_URL,
    mastraStorageUrl: parsed.MASTRA_STORAGE_URL,
  };
}
