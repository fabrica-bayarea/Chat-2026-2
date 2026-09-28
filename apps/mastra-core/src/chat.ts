import { loadLlmConfig } from "./config/llm.config.js";
import { mastra } from "./mastra.config.js";

export class AgentError extends Error {
  constructor(
    message: string,
    readonly kind: "unavailable" | "model_not_found" | "timeout" | "empty" | "unknown",
  ) {
    super(message);
    this.name = "AgentError";
  }
}

// Junta a mensagem do erro e das causas, pois o SDK costuma embrulhar o erro real
function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i++) {
    if (current instanceof Error) {
      parts.push(current.name, current.message);
      const { code, cause } = current as { code?: string; cause?: unknown };
      if (code) parts.push(code);
      current = cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.join(" | ").toLowerCase();
}

function toAgentError(error: unknown, baseUrl: string, model: string): AgentError {
  if (error instanceof AgentError) return error;
  const text = describeError(error);

  if (text.includes("timeout") || text.includes("abort")) {
    return new AgentError("O modelo demorou demais para responder.", "timeout");
  }
  if (text.includes("econnrefused") || text.includes("fetch failed") || text.includes("cannot connect")) {
    return new AgentError(
      `Não foi possível conectar ao Ollama em ${baseUrl}. Ele está rodando? (tente \`ollama serve\`)`,
      "unavailable",
    );
  }
  if (text.includes("not found") || text.includes("404")) {
    return new AgentError(
      `O modelo "${model}" não foi encontrado no Ollama. Baixe com \`ollama pull ${model}\`.`,
      "model_not_found",
    );
  }
  return new AgentError("Erro inesperado ao gerar a resposta do modelo.", "unknown");
}

export async function askAgent(message: string): Promise<string> {
  const { baseUrl, model, temperature, maxTokens, timeoutMs } = loadLlmConfig();
  const agent = mastra.getAgent("collegeAgent");

  try {
    const result = await agent.generate(message, {
      modelSettings: { temperature, maxOutputTokens: maxTokens },
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
    const text = result.text?.trim();
    if (!text) throw new AgentError("O modelo devolveu uma resposta vazia.", "empty");
    return text;
  } catch (error) {
    throw toAgentError(error, baseUrl, model);
  }
}