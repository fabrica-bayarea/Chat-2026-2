import { BadRequestException } from '@nestjs/common';
import type { ConversationMessage, Feedback, MessageRole } from './conversations.types.js';

// Mesmos limites da tabela (migrations/001_historico_conversas.sql)
const CONVERSATION_ID = /^[A-Za-z0-9_-]{1,100}$/;
const MAX_MESSAGE_ID = 100;
const MAX_TITLE = 200;
const MAX_MESSAGES = 500;
const MAX_PARTS = 100;
const ROLES: MessageRole[] = ['user', 'assistant', 'system'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseConversationId(value: unknown): string {
  if (typeof value !== 'string' || !CONVERSATION_ID.test(value)) {
    throw new BadRequestException('Id de conversa inválido.');
  }
  return value;
}

export function parseMessageId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_MESSAGE_ID) {
    throw new BadRequestException('Id de mensagem inválido.');
  }
  return value;
}

export function parseTitle(body: unknown): string {
  const title = isPlainObject(body) ? body.title : undefined;
  if (typeof title !== 'string') throw new BadRequestException('Campo title obrigatório.');
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > MAX_TITLE) {
    throw new BadRequestException(`O título deve ter entre 1 e ${MAX_TITLE} caracteres.`);
  }
  return trimmed;
}

export function parseFeedback(body: unknown): Feedback | null {
  const value = isPlainObject(body) ? body.value : undefined;
  if (value === null || value === 'up' || value === 'down') return value;
  throw new BadRequestException('Campo value deve ser "up", "down" ou null.');
}

// Mensagens no formato do AI SDK. Só a estrutura é conferida; o conteúdo das partes é
// guardado como veio (texto, anexo, raciocínio...).
export function parseMessages(body: unknown): ConversationMessage[] {
  const messages = isPlainObject(body) ? body.messages : undefined;
  if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
    throw new BadRequestException(`Campo messages deve ser uma lista de até ${MAX_MESSAGES} mensagens.`);
  }

  const seenIds = new Set<string>();
  return messages.map((message, index) => {
    const where = `messages[${index}]`;
    if (!isPlainObject(message)) throw new BadRequestException(`${where} inválida.`);

    const id = parseMessageId(message.id);
    if (seenIds.has(id)) throw new BadRequestException(`${where}: id repetido.`);
    seenIds.add(id);

    if (!ROLES.includes(message.role as MessageRole)) {
      throw new BadRequestException(`${where}: role deve ser user, assistant ou system.`);
    }

    const parts = message.parts;
    if (
      !Array.isArray(parts) ||
      parts.length > MAX_PARTS ||
      !parts.every((part) => isPlainObject(part) && typeof part.type === 'string')
    ) {
      throw new BadRequestException(`${where}: parts inválidas.`);
    }

    if (message.metadata !== undefined && !isPlainObject(message.metadata)) {
      throw new BadRequestException(`${where}: metadata inválido.`);
    }

    return {
      id,
      role: message.role as MessageRole,
      parts,
      ...(message.metadata ? { metadata: message.metadata as Record<string, unknown> } : {}),
    };
  });
}
