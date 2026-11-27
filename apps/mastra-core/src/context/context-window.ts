import type { ContextConfig } from "../config/context.config.js";

type IncomingPart = { type: string; text?: unknown; filename?: unknown };

export type IncomingMessage = {
  id?: string;
  role: "user" | "assistant";
  parts: IncomingPart[];
};

export type WindowMessage = {
  id?: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
};

const MAX_FILENAME_CHARS = 100;

// O modelo só lê texto. Anexo vira uma nota curta com o nome do arquivo (o conteúdo,
// em base64, gastaria muito token e o modelo não entende). Outras partes (ex.: "step-start")
// não têm conteúdo para o modelo e saem.
function toTextOnly(message: IncomingMessage): WindowMessage {
  const parts: WindowMessage["parts"] = [];
  for (const part of message.parts) {
    if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
      parts.push({ type: "text", text: part.text });
    } else if (part.type === "file") {
      const name =
        typeof part.filename === "string" && part.filename.trim()
          ? part.filename.trim().slice(0, MAX_FILENAME_CHARS)
          : "arquivo";
      parts.push({ type: "text", text: `[anexo não lido pelo assistente: ${name}]` });
    }
  }
  return { ...(message.id ? { id: message.id } : {}), role: message.role, parts };
}

function textLength(message: WindowMessage): number {
  return message.parts.reduce((sum, part) => sum + part.text.length, 0);
}

// Janela de contexto: o pedaço da conversa que vai para o modelo a cada resposta.
// - só as últimas `historySize` mensagens;
// - e, somadas, até `maxChars` caracteres: tira as mais antigas até caber.
// A última mensagem (a pergunta atual) sempre fica.
export function buildContextWindow(
  messages: IncomingMessage[],
  config: ContextConfig,
): WindowMessage[] {
  const window = messages
    .map(toTextOnly)
    .filter((message) => message.parts.length > 0)
    .slice(-config.historySize);

  let total = window.reduce((sum, message) => sum + textLength(message), 0);
  while (window.length > 1 && total > config.maxChars) {
    const oldest = window.shift();
    if (oldest) total -= textLength(oldest);
  }
  return window;
}
