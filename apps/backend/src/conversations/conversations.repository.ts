import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module.js';
import type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  Feedback,
} from './conversations.types.js';

type ConversationRow = { id: string; title: string; created_at: Date; updated_at: Date };

type MessageRow = {
  message_id: string;
  role: ConversationMessage['role'];
  parts: unknown[];
  metadata: Record<string, unknown> | null;
  feedback: Feedback | null;
};

function toSummary(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at.getTime(),
    updatedAt: row.updated_at.getTime(),
  };
}

// Todo acesso a dados do histórico passa por aqui (só SQL, sem regra de negócio).
// Toda consulta de conversa filtra pelo dono: uma pessoa nunca lê nem altera a conversa de outra.
@Injectable()
export class ConversationsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async createUser(): Promise<string> {
    const id = randomUUID();
    await this.pool.query('INSERT INTO users (id) VALUES ($1)', [id]);
    return id;
  }

  async userExists(userId: string): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
    return result.rowCount === 1;
  }

  async listByUser(userId: string): Promise<ConversationSummary[]> {
    const result = await this.pool.query<ConversationRow>(
      `SELECT id, title, created_at, updated_at
         FROM conversations
        WHERE user_id = $1
        ORDER BY updated_at DESC`,
      [userId],
    );
    return result.rows.map(toSummary);
  }

  async findForUser(userId: string, conversationId: string): Promise<ConversationDetail | undefined> {
    const conversation = await this.pool.query<ConversationRow>(
      `SELECT id, title, created_at, updated_at
         FROM conversations
        WHERE id = $1 AND user_id = $2`,
      [conversationId, userId],
    );
    const row = conversation.rows[0];
    if (!row) return undefined;

    const messages = await this.pool.query<MessageRow>(
      `SELECT message_id, role, parts, metadata, feedback
         FROM messages
        WHERE conversation_id = $1
        ORDER BY position`,
      [conversationId],
    );

    const feedback: Record<string, Feedback> = {};
    const list: ConversationMessage[] = messages.rows.map((message) => {
      if (message.feedback) feedback[message.message_id] = message.feedback;
      return {
        id: message.message_id,
        role: message.role,
        parts: message.parts,
        ...(message.metadata ? { metadata: message.metadata } : {}),
      };
    });

    return { ...toSummary(row), messages: list, feedback };
  }

  // Cria a conversa. undefined se o id já existe (de qualquer pessoa).
  async create(
    userId: string,
    conversationId: string,
    title: string,
  ): Promise<ConversationSummary | undefined> {
    const result = await this.pool.query<ConversationRow>(
      `INSERT INTO conversations (id, user_id, title)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, title, created_at, updated_at`,
      [conversationId, userId, title],
    );
    const row = result.rows[0];
    return row ? toSummary(row) : undefined;
  }

  // Grava a conversa inteira na ordem recebida, numa transação:
  // - cria a conversa se ainda não existe (com titleIfNew);
  // - insere as mensagens novas e atualiza as que já existiam (o feedback é mantido);
  // - apaga as que não vieram mais (ex.: resposta trocada ao regenerar).
  // false se a conversa existe e é de outra pessoa (nada é gravado).
  async saveMessages(
    userId: string,
    conversationId: string,
    messages: ConversationMessage[],
    titleIfNew: string,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO conversations (id, user_id, title)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [conversationId, userId, titleIfNew],
      );

      // Trava a conversa: duas gravações da mesma conversa não se misturam
      const owner = await client.query<{ user_id: string }>(
        'SELECT user_id FROM conversations WHERE id = $1 FOR UPDATE',
        [conversationId],
      );
      if (owner.rows[0]?.user_id !== userId) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query(
        `DELETE FROM messages
          WHERE conversation_id = $1 AND NOT (message_id = ANY($2::text[]))`,
        [conversationId, messages.map((message) => message.id)],
      );

      for (const [position, message] of messages.entries()) {
        await client.query(
          `INSERT INTO messages (conversation_id, message_id, role, parts, metadata, position)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (conversation_id, message_id) DO UPDATE
              SET role = EXCLUDED.role,
                  parts = EXCLUDED.parts,
                  metadata = EXCLUDED.metadata,
                  position = EXCLUDED.position,
                  updated_at = now()`,
          [
            conversationId,
            message.id,
            message.role,
            JSON.stringify(message.parts),
            message.metadata ? JSON.stringify(message.metadata) : null,
            position,
          ],
        );
      }

      await client.query('UPDATE conversations SET updated_at = now() WHERE id = $1', [
        conversationId,
      ]);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // updated_at marca a última mensagem (ordem da lista); renomear não mexe nele,
  // como já era no front
  async rename(userId: string, conversationId: string, title: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE conversations SET title = $3
        WHERE id = $1 AND user_id = $2`,
      [conversationId, userId, title],
    );
    return result.rowCount === 1;
  }

  // As mensagens saem junto (ON DELETE CASCADE)
  async remove(userId: string, conversationId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId],
    );
    return result.rowCount === 1;
  }

  async setFeedback(
    userId: string,
    conversationId: string,
    messageId: string,
    value: Feedback | null,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE messages AS m
          SET feedback = $4, updated_at = now()
         FROM conversations AS c
        WHERE m.conversation_id = c.id
          AND c.id = $1 AND c.user_id = $2 AND m.message_id = $3`,
      [conversationId, userId, messageId, value],
    );
    return result.rowCount === 1;
  }
}
