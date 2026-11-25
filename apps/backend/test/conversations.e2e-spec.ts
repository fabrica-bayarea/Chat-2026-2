import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type pg from 'pg';
import request from 'supertest';
import { ConversationsModule } from '../src/conversations/conversations.module.js';
import { DATABASE_POOL, DatabaseModule } from '../src/database/database.module.js';
import { runMigrations } from '../src/database/migrations.js';
import { freshTestDatabase } from './test-database.js';

// Integração de verdade: API do Nest + PostgreSQL (banco de teste recriado do zero)

type Message = { id: string; role: string; parts: unknown[]; metadata?: Record<string, unknown> };

function text(id: string, role: string, value: string): Message {
  return { id, role, parts: [{ type: 'text', text: value }] };
}

describe('Histórico de conversas (e2e com PostgreSQL)', () => {
  let app: INestApplication;
  let pool: pg.Pool;

  // Cada "navegador" guarda o próprio cookie, como um usuário diferente
  function browser() {
    return request.agent(app.getHttpServer());
  }

  beforeAll(async () => {
    const testPool = await freshTestDatabase();
    await testPool.end();

    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, ConversationsModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    pool = app.get(DATABASE_POOL);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE users CASCADE');
  });

  describe('migrations', () => {
    it('criam as tabelas e não reaplicam o que já foi aplicado', async () => {
      const tables = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' ORDER BY table_name`,
      );
      expect(tables.rows.map((row) => row.table_name)).toEqual([
        'conversations',
        'messages',
        'schema_migrations',
        'users',
      ]);

      expect(await runMigrations(pool)).toEqual([]);
    });
  });

  describe('criar, gravar e recuperar', () => {
    it('cria uma conversa nova e manda o cookie httponly do usuário', async () => {
      const response = await request(app.getHttpServer()).post('/api/conversations').send({});

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ title: 'Nova conversa' });
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.createdAt).toBe('number');

      const cookie = (response.headers['set-cookie'] as unknown as string[])[0]!;
      expect(cookie).toMatch(/^chat_usuario=/);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      // Nenhum id interno do usuário no corpo da resposta
      expect(JSON.stringify(response.body)).not.toContain(cookie.split(';')[0]!.split('=')[1]!);
    });

    it('grava mensagens de usuário e assistente e devolve a conversa em ordem', async () => {
      const agent = browser();
      const messages = [
        { ...text('u1', 'user', 'Quais cursos de tecnologia vocês têm?'), metadata: { createdAt: 1 } },
        text('a1', 'assistant', 'Temos vários cursos.'),
        text('u2', 'user', 'E o de Ciência da Computação?'),
        text('a2', 'assistant', 'É presencial.'),
      ];

      const save = await agent.put('/api/conversations/chat-ordem/messages').send({ messages });
      expect(save.status).toBe(204);

      const conversation = await agent.get('/api/conversations/chat-ordem');
      expect(conversation.status).toBe(200);
      expect(conversation.body.title).toBe('Quais cursos de tecnologia vocês têm?');
      expect(conversation.body.messages).toEqual(messages);
      expect(conversation.body.feedback).toEqual({});
    });

    it('regravar mantém a ordem nova, apaga a resposta trocada e guarda o feedback das outras', async () => {
      const agent = browser();
      const first = [text('u1', 'user', 'Oi'), text('a1', 'assistant', 'Olá!')];
      await agent.put('/api/conversations/chat-regenerar/messages').send({ messages: first });
      await agent.put('/api/conversations/chat-regenerar/messages/a1/feedback').send({ value: 'up' });

      // Nova pergunta e nova resposta: a1 continua (com feedback)
      const second = [...first, text('u2', 'user', 'Tudo bem?'), text('a2', 'assistant', 'Tudo!')];
      await agent.put('/api/conversations/chat-regenerar/messages').send({ messages: second });
      // Regenerar a última resposta: a2 sai, a2b entra
      const regenerated = [...second.slice(0, 3), text('a2b', 'assistant', 'Tudo ótimo!')];
      await agent.put('/api/conversations/chat-regenerar/messages').send({ messages: regenerated });

      const conversation = await agent.get('/api/conversations/chat-regenerar');
      expect(conversation.body.messages.map((message: Message) => message.id)).toEqual([
        'u1',
        'a1',
        'u2',
        'a2b',
      ]);
      expect(conversation.body.feedback).toEqual({ a1: 'up' });

      const stored = await pool.query(
        `SELECT count(*)::int AS total FROM messages WHERE conversation_id = 'chat-regenerar'`,
      );
      expect(stored.rows[0].total).toBe(4);
    });

    it('lista só as conversas do usuário, da mais recente para a mais antiga', async () => {
      const agent = browser();
      await agent.put('/api/conversations/chat-antiga/messages').send({ messages: [text('u1', 'user', 'Antiga')] });
      await agent.put('/api/conversations/chat-nova/messages').send({ messages: [text('u1', 'user', 'Nova')] });

      const outro = browser();
      await outro.put('/api/conversations/chat-de-outro/messages').send({ messages: [text('u1', 'user', 'Outro')] });

      const list = await agent.get('/api/conversations');
      expect(list.body.map((item: { id: string }) => item.id)).toEqual(['chat-nova', 'chat-antiga']);
      expect(Object.keys(list.body[0]).sort()).toEqual(['createdAt', 'id', 'title', 'updatedAt']);
    });

    it('renomeia e apaga a conversa (as mensagens saem junto)', async () => {
      const agent = browser();
      await agent.put('/api/conversations/chat-x/messages').send({ messages: [text('u1', 'user', 'Oi')] });

      expect((await agent.patch('/api/conversations/chat-x').send({ title: '  Meu título  ' })).status).toBe(204);
      expect((await agent.get('/api/conversations/chat-x')).body.title).toBe('Meu título');

      expect((await agent.delete('/api/conversations/chat-x')).status).toBe(204);
      expect((await agent.get('/api/conversations/chat-x')).status).toBe(404);
      const left = await pool.query(`SELECT 1 FROM messages WHERE conversation_id = 'chat-x'`);
      expect(left.rowCount).toBe(0);
    });
  });

  describe('dados não expostos', () => {
    it('outra pessoa não lê, não grava por cima, não renomeia e não apaga a conversa', async () => {
      const dona = browser();
      await dona.put('/api/conversations/chat-privado/messages').send({ messages: [text('u1', 'user', 'Segredo')] });

      const intrusa = browser();
      await intrusa.post('/api/conversations').send({}); // tem um usuário próprio

      expect((await intrusa.get('/api/conversations/chat-privado')).status).toBe(404);
      expect(
        (await intrusa.put('/api/conversations/chat-privado/messages').send({ messages: [text('x', 'user', 'Invadi')] })).status,
      ).toBe(404);
      expect((await intrusa.patch('/api/conversations/chat-privado').send({ title: 'Invadi' })).status).toBe(404);
      expect((await intrusa.put('/api/conversations/chat-privado/messages/u1/feedback').send({ value: 'down' })).status).toBe(404);
      expect((await intrusa.delete('/api/conversations/chat-privado')).status).toBe(404);
      // A lista da intrusa só tem a conversa que ela mesma criou
      const listaDaIntrusa = (await intrusa.get('/api/conversations')).body as Array<{ id: string }>;
      expect(listaDaIntrusa).toHaveLength(1);
      expect(listaDaIntrusa.map((item) => item.id)).not.toContain('chat-privado');

      const intacta = await dona.get('/api/conversations/chat-privado');
      expect(intacta.body.title).toBe('Segredo');
      expect(intacta.body.messages).toEqual([text('u1', 'user', 'Segredo')]);
      expect(intacta.body.feedback).toEqual({});
    });

    it('sem cookie: lista vazia e nenhum usuário criado só por ler', async () => {
      const response = await request(app.getHttpServer()).get('/api/conversations');

      expect(response.body).toEqual([]);
      expect(response.headers['set-cookie']).toBeUndefined();
      expect((await pool.query('SELECT 1 FROM users')).rowCount).toBe(0);
    });

    it('cookie inventado não dá acesso a nada', async () => {
      const dona = browser();
      await dona.put('/api/conversations/chat-y/messages').send({ messages: [text('u1', 'user', 'Oi')] });

      const fake = await request(app.getHttpServer())
        .get('/api/conversations/chat-y')
        .set('Cookie', 'chat_usuario=00000000-0000-4000-8000-000000000000');
      expect(fake.status).toBe(404);
    });
  });

  describe('validação e integridade', () => {
    it('recusa id, role, parts e título inválidos (400) sem gravar nada', async () => {
      const agent = browser();
      const invalid = [
        agent.put('/api/conversations/id%20com%20espaco/messages').send({ messages: [] }),
        agent.put('/api/conversations/chat-z/messages').send({ messages: [{ id: 'u1', role: 'hacker', parts: [] }] }),
        agent.put('/api/conversations/chat-z/messages').send({ messages: [{ id: 'u1', role: 'user' }] }),
        agent.put('/api/conversations/chat-z/messages').send({ messages: [text('u1', 'user', 'a'), text('u1', 'user', 'b')] }),
        agent.put('/api/conversations/chat-z/messages').send({}),
      ];
      for (const response of await Promise.all(invalid)) expect(response.status).toBe(400);
      expect((await pool.query(`SELECT 1 FROM conversations WHERE id = 'chat-z'`)).rowCount).toBe(0);

      await agent.put('/api/conversations/chat-z/messages').send({ messages: [text('u1', 'user', 'Oi')] });
      expect((await agent.patch('/api/conversations/chat-z').send({ title: '   ' })).status).toBe(400);
    });

    it('o banco garante as chaves estrangeiras, o role e a exclusão em cascata', async () => {
      // Mensagem sem conversa e conversa sem usuário não entram
      await expect(
        pool.query(
          `INSERT INTO messages (conversation_id, message_id, role, parts, position)
           VALUES ('nao-existe', 'm1', 'user', '[]', 0)`,
        ),
      ).rejects.toThrow(/foreign key/);
      await expect(
        pool.query(
          `INSERT INTO conversations (id, user_id, title)
           VALUES ('c1', '00000000-0000-4000-8000-000000000000', 'x')`,
        ),
      ).rejects.toThrow(/foreign key/);

      const agent = browser();
      await agent.put('/api/conversations/chat-w/messages').send({ messages: [text('u1', 'user', 'Oi')] });

      // role fora da lista é barrado pelo próprio banco
      await expect(
        pool.query(`UPDATE messages SET role = 'hacker' WHERE conversation_id = 'chat-w'`),
      ).rejects.toThrow(/check constraint/);

      // Apagar o usuário apaga as conversas e as mensagens dele
      await pool.query('DELETE FROM users');
      expect((await pool.query('SELECT 1 FROM conversations')).rowCount).toBe(0);
      expect((await pool.query('SELECT 1 FROM messages')).rowCount).toBe(0);
    });
  });
});
