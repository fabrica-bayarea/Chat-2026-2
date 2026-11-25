import { MastraLogger } from "@mastra/core/logger";

// Logger do Mastra que NUNCA imprime os objetos que vêm junto com a mensagem.
//
// O logger padrão imprimia o erro inteiro do provedor (ex.: "Upstream LLM API error"), e esse
// objeto carrega o corpo da requisição ao modelo: o prompt com a conversa do aluno e
// resultados de ferramentas (dados de matrícula). Aqui só sai a mensagem e, de cada erro,
// o nome e o status HTTP.

type ErrorSummary = { name?: string; status?: number };

function summarize(value: unknown): ErrorSummary | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  // O Mastra costuma mandar { error: Error } como argumento
  if (record.error && typeof record.error === "object") return summarize(record.error);

  const name = typeof record.name === "string" ? record.name : undefined;
  const status = typeof record.statusCode === "number" ? record.statusCode : undefined;
  if (!name && status === undefined) return undefined;
  return { name, status };
}

export function formatSafeLog(message: string, args: unknown[]): string {
  const details = args
    .map(summarize)
    .filter((summary): summary is ErrorSummary => summary !== undefined)
    .map((summary) => [summary.name, summary.status].filter((part) => part !== undefined).join(" "));
  return details.length > 0 ? `[mastra] ${message} (${details.join(", ")})` : `[mastra] ${message}`;
}

export class SafeLogger extends MastraLogger {
  constructor() {
    // Só avisos e erros: debug/info do Mastra também carregam dados das execuções
    super({ name: "mastra", level: "warn" });
  }

  debug(): void {}

  info(): void {}

  warn(message: string, ...args: unknown[]): void {
    console.warn(formatSafeLog(message, args));
  }

  error(message: string, ...args: unknown[]): void {
    console.error(formatSafeLog(message, args));
  }
}
