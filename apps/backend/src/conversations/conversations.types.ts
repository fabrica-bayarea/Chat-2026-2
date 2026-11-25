// Formatos que saem da API. Datas em milissegundos (como o front já usa).

export type MessageRole = 'user' | 'assistant' | 'system';

export type Feedback = 'up' | 'down';

// Mensagem no formato do AI SDK (UIMessage): partes e metadados guardados como vieram
export type ConversationMessage = {
  id: string;
  role: MessageRole;
  parts: unknown[];
  metadata?: Record<string, unknown>;
};

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
  // Feedback das mensagens do assistente, por id da mensagem
  feedback: Record<string, Feedback>;
};
