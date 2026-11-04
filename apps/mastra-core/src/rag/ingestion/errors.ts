export type IngestionStage = "coleta" | "extracao" | "embeddings" | "armazenamento";

export class IngestionError extends Error {
  constructor(
    message: string,
    readonly stage: IngestionStage,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "IngestionError";
  }
}

// Executa uma etapa e converte qualquer erro em IngestionError com mensagem legível
export async function runStage<T>(stage: IngestionStage, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof IngestionError) throw error;
    throw new IngestionError(toMessage(error, stage), stage, { cause: error });
  }
}

function toMessage(error: unknown, stage: IngestionStage): string {
  const text = errorChainText(error);
  // O Ollama responde 404 quando o modelo não foi baixado
  if (stage === "embeddings" && (text.includes("not found") || text.includes("404"))) {
    return "modelo de embeddings não encontrado no Ollama";
  }
  if (text.includes("timeouterror") || text.includes("timeout")) return "tempo esgotado";
  if (
    text.includes("econnrefused") ||
    text.includes("fetch failed") ||
    text.includes("cannot connect")
  ) {
    return "não foi possível conectar";
  }
  if (text.includes("invalidpdf") || text.includes("invalid pdf")) {
    return "arquivo PDF inválido ou corrompido";
  }
  return error instanceof Error ? error.message : String(error);
}

// Nome, mensagem e código do erro e das causas (o fetch esconde o motivo real em cause).
// Não reaproveita o describeError do chat.ts porque importá-lo carrega o agente e exige LLM_MODEL
function errorChainText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i++) {
    if (!(current instanceof Error)) {
      parts.push(String(current));
      break;
    }
    const { code, cause } = current as { code?: string; cause?: unknown };
    parts.push(current.name, current.message, code ?? "");
    current = cause;
  }
  return parts.join(" | ").toLowerCase();
}
