import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

// Histórico confiável da conversa, guardado no servidor.
//
// O navegador manda a conversa inteira a cada mensagem (é assim que o useChat funciona), mas
// o servidor NÃO confia nela: uma pessoa pode forjar respostas do assistente ou resultados de
// ferramenta. Por isso o agente só recebe o que está aqui, mais a última mensagem do usuário.

export type StoredPart =
  | { type: "text"; text: string }
  | { type: "file"; mediaType: string; url: string; filename?: string };

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  parts: StoredPart[];
};

// Dono da conversa: "visitante" ou "aluno:<matrícula>"
export type ConversationOwner = string;

export const VISITOR_OWNER: ConversationOwner = "visitante";

export function studentOwner(matricula: string): ConversationOwner {
  return `aluno:${matricula}`;
}

export type StoredConversation = {
  owner: ConversationOwner;
  messages: StoredMessage[];
};

export type ChatHistoryStore = {
  load(chatId: string): Promise<StoredConversation | undefined>;
  save(chatId: string, conversation: StoredConversation): Promise<void>;
};

// Guarda cada conversa como uma linha com as mensagens em JSON: simples e suficiente
export async function createLibSQLChatHistory(url: string, maxMessages: number): Promise<ChatHistoryStore> {
  if (url.startsWith("file:")) {
    await mkdir(path.dirname(url.slice("file:".length)), { recursive: true });
  }

  const db: Client = createClient({ url });
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      messages TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return {
    async load(chatId) {
      const result = await db.execute({
        sql: "SELECT owner, messages FROM chat_conversations WHERE id = ?",
        args: [chatId],
      });
      const row = result.rows[0];
      if (!row) return undefined;
      return {
        owner: String(row.owner),
        messages: JSON.parse(String(row.messages)) as StoredMessage[],
      };
    },

    async save(chatId, conversation) {
      // Só as últimas mensagens: a conversa não cresce sem limite
      const messages = conversation.messages.slice(-maxMessages);
      await db.execute({
        sql: `INSERT INTO chat_conversations (id, owner, messages, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET owner = excluded.owner, messages = excluded.messages, updated_at = excluded.updated_at`,
        args: [chatId, conversation.owner, JSON.stringify(messages), new Date().toISOString()],
      });
    },
  };
}

export class ConversationAccessError extends Error {
  constructor(readonly kind: "forbidden" | "invalid") {
    super(
      kind === "forbidden"
        ? "Esta conversa pertence a outra conta. Entre com a conta certa ou comece uma nova conversa."
        : "Não há mensagem do usuário para responder nesta conversa.",
    );
    this.name = "ConversationAccessError";
  }
}

type IncomingMessage = {
  id?: string;
  role: "user" | "assistant";
  parts: Array<{ type: string }>;
};

// Da mensagem do usuário, só texto e anexo. Qualquer outra parte (tool, source, data, reasoning)
// é descartada: o usuário não tem por que mandar isso.
export function sanitizeUserMessage(message: IncomingMessage, fallbackId: string): StoredMessage {
  const parts: StoredPart[] = [];
  for (const part of message.parts) {
    const raw = part as Record<string, unknown>;
    if (raw.type === "text" && typeof raw.text === "string") {
      parts.push({ type: "text", text: raw.text });
      continue;
    }
    // Anexo só como data: URL (é o que o front manda). URL http faria o servidor baixar
    // um endereço escolhido pelo cliente.
    const url = typeof raw.url === "string" ? raw.url : "";
    if (raw.type === "file" && url.startsWith("data:") && typeof raw.mediaType === "string") {
      parts.push({
        type: "file",
        mediaType: raw.mediaType,
        url,
        ...(typeof raw.filename === "string" ? { filename: raw.filename } : {}),
      });
    }
  }
  return { id: message.id ?? fallbackId, role: "user", parts };
}

// Monta a conversa que o agente vai receber, a partir do histórico do servidor.
// - Conversa de aluno só continua com o mesmo aluno.
// - Conversa de visitante pode ser assumida por um aluno que entrou no meio dela.
// - "regenerate-message": apaga a última resposta guardada e responde de novo à mesma pergunta.
// - Envio normal: acrescenta só a última mensagem do usuário (limpa).
export function buildTrustedConversation(input: {
  stored: StoredConversation | undefined;
  owner: ConversationOwner;
  trigger: string | undefined;
  incoming: IncomingMessage[];
  newMessageId: string;
}): StoredConversation {
  const { stored, owner, trigger, incoming, newMessageId } = input;

  if (stored && stored.owner !== VISITOR_OWNER && stored.owner !== owner) {
    throw new ConversationAccessError("forbidden");
  }

  const messages = [...(stored?.messages ?? [])];

  if (trigger === "regenerate-message") {
    while (messages.at(-1)?.role === "assistant") messages.pop();
    if (messages.at(-1)?.role === "user") return { owner, messages };
    // Conversa que o servidor não conhece (ex.: criada antes do histórico no servidor):
    // segue como envio normal, só com a última pergunta
  }

  const last = incoming.at(-1);
  if (!last || last.role !== "user") throw new ConversationAccessError("invalid");

  const userMessage = sanitizeUserMessage(last, newMessageId);
  if (userMessage.parts.length === 0) throw new ConversationAccessError("invalid");

  messages.push(userMessage);
  return { owner, messages };
}
