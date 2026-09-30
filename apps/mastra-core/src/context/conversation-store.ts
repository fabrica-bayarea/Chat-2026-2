import { loadContextConfig } from "../config/context.config.js";

export type ConversationRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
};

// Histórico em memória por sessão. Não é persistente: reinicia junto com o processo.
// Para persistência entre reinícios, trocar por um adaptador de storage do Mastra no futuro.
const sessions = new Map<string, ConversationMessage[]>();

export function getHistory(sessionId: string): ConversationMessage[] {
  return sessions.get(sessionId) ?? [];
}

export function appendExchange(
  sessionId: string,
  userMessage: string,
  assistantReply: string,
): void {
  const { historySize } = loadContextConfig();
  const history = sessions.get(sessionId) ?? [];

  history.push({ role: "user", content: userMessage });
  history.push({ role: "assistant", content: assistantReply });

  // Mantém só as últimas N mensagens (janela de contexto)
  const trimmed = history.slice(-historySize);
  sessions.set(sessionId, trimmed);
}

// Útil para testes e para um futuro endpoint de "limpar conversa"
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}