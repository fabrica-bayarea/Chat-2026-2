import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { collegeAgent } from "./agent.js";
import { loadStorageConfig } from "./config/storage.config.js";
import { SafeLogger } from "./logging/safe-logger.js";

const storage = loadStorageConfig();

export const mastra = new Mastra({
  agents: { collegeAgent },
  // Persistente (arquivo LibSQL), em vez da memória que se perdia ao reiniciar
  storage: new LibSQLStore({ id: "mastra-storage", url: storage.mastraStorageUrl }),
  // Não imprime prompts, conversas nem resultados de ferramentas nos logs
  logger: new SafeLogger(),
});
