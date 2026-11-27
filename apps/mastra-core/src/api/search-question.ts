// Monta a pergunta usada na busca do RAG a partir das mensagens da conversa

type IncomingMessage = {
  role: "user" | "assistant";
  parts: Array<{ type: string }>;
};

function getMessageText(message: IncomingMessage): string {
  const texts: string[] = [];
  for (const part of message.parts) {
    if (part.type !== "text") continue;
    const text = (part as { text?: unknown }).text;
    if (typeof text === "string") texts.push(text);
  }
  return texts.join("\n").trim();
}

function getUserQuestions(messages: IncomingMessage[]): string[] {
  return messages.filter((message) => message.role === "user").map(getMessageText);
}

// Pergunta curta de continuação ("e no sábado?", "quanto custa?") não tem assunto suficiente
// para a busca; até esse tamanho, a pergunta anterior do usuário entra junto na consulta
export const FOLLOW_UP_MAX_WORDS = 4;

// Pergunta usada na busca do RAG
export function getSearchQuestion(messages: IncomingMessage[]): string {
  const questions = getUserQuestions(messages);
  const last = questions.at(-1) ?? "";
  if (!last) return "";

  const words = last.split(/\s+/).filter(Boolean).length;
  if (words > FOLLOW_UP_MAX_WORDS) return last;

  const previous = questions.slice(0, -1).reverse().find((question) => question.length > 0);
  return previous ? `${previous}\n${last}` : last;
}
