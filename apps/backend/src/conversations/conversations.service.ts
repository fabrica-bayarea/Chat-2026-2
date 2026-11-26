import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConversationsRepository } from './conversations.repository.js';
import { loadHistoryConfig } from './history.config.js';
import type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  Feedback,
} from './conversations.types.js';

const DEFAULT_TITLE = 'Nova conversa';
const TITLE_MAX_LENGTH = 60;

// Título a partir da primeira mensagem do usuário (mesma regra que o front usava)
export function deriveTitle(messages: ConversationMessage[]): string {
  const firstUser = messages.find((message) => message.role === 'user');
  const parts = (firstUser?.parts ?? []) as Array<Record<string, unknown>>;

  const text = parts
    .map((part) => (part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    const file = parts.find((part) => part.type === 'file');
    const filename = typeof file?.filename === 'string' ? file.filename : undefined;
    return filename ? `📎 ${filename}`.slice(0, 200) : DEFAULT_TITLE;
  }
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH).trimEnd()}…` : text;
}

// Conversa que não existe e conversa de outra pessoa dão a mesma resposta:
// não revela que o id existe
const NOT_FOUND = 'Conversa não encontrada.';

@Injectable()
export class ConversationsService {
  private readonly history = loadHistoryConfig();

  constructor(private readonly repository: ConversationsRepository) {}

  // Id do usuário que vai gravar algo: o do cookie, se ele existe no banco, ou um novo
  async ensureUser(userId: string | undefined): Promise<{ userId: string; created: boolean }> {
    if (userId && (await this.repository.userExists(userId))) return { userId, created: false };
    return { userId: await this.repository.createUser(), created: true };
  }

  list(userId: string | undefined): Promise<ConversationSummary[]> {
    if (!userId) return Promise.resolve([]);
    return this.repository.listByUser(userId);
  }

  async get(userId: string | undefined, conversationId: string): Promise<ConversationDetail> {
    const conversation = userId
      ? await this.repository.findForUser(userId, conversationId)
      : undefined;
    if (!conversation) throw new NotFoundException(NOT_FOUND);
    return conversation;
  }

  // Sem id, o backend gera um
  async create(userId: string, conversationId?: string): Promise<ConversationSummary> {
    const id = conversationId ?? randomUUID();
    const created = await this.repository.create(userId, id, DEFAULT_TITLE);
    if (!created) throw new ConflictException('Já existe uma conversa com esse id.');
    return created;
  }

  async saveMessages(
    userId: string,
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void> {
    const result = await this.repository.saveMessages(
      userId,
      conversationId,
      messages,
      deriveTitle(messages),
      this.history.maxBytesPerUser,
    );
    if (result === 'not_found') throw new NotFoundException(NOT_FOUND);
    if (result === 'over_limit') {
      const mb = Math.round(this.history.maxBytesPerUser / (1024 * 1024));
      throw new HttpException(
        `Seu histórico atingiu o limite de ${mb} MB. Exclua conversas antigas para continuar salvando.`,
        HttpStatus.INSUFFICIENT_STORAGE,
      );
    }
  }

  async rename(userId: string | undefined, conversationId: string, title: string): Promise<void> {
    const renamed = userId && (await this.repository.rename(userId, conversationId, title));
    if (!renamed) throw new NotFoundException(NOT_FOUND);
  }

  async remove(userId: string | undefined, conversationId: string): Promise<void> {
    const removed = userId && (await this.repository.remove(userId, conversationId));
    if (!removed) throw new NotFoundException(NOT_FOUND);
  }

  async setFeedback(
    userId: string | undefined,
    conversationId: string,
    messageId: string,
    value: Feedback | null,
  ): Promise<void> {
    const updated =
      userId && (await this.repository.setFeedback(userId, conversationId, messageId, value));
    if (!updated) throw new NotFoundException('Mensagem não encontrada.');
  }
}
