import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { AppModule, ObserveInstrument } from '../src/app.module.js';
import { freshTestDatabase } from './test-database.js';

// O backend de verdade, montado como no main.ts: AppModule inteiro + telemetria do
// @nestjs/observe. A telemetria embrulha os providers e já quebrou o acesso ao banco
// (só aparecia com o main.ts, não nos testes que sobem só o módulo de conversas).
describe('Histórico no AppModule com a telemetria do main.ts', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const pool = await freshTestDatabase();
    await pool.end();
    app = await NestFactory.create(AppModule, { instrument: ObserveInstrument, logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria, grava e lê uma conversa', async () => {
    const agent = request.agent(app.getHttpServer());

    expect((await agent.post('/api/conversations').send({})).status).toBe(201);

    const save = await agent
      .put('/api/conversations/chat-app/messages')
      .send({ messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Oi' }] }] });
    expect(save.status).toBe(204);

    const conversation = await agent.get('/api/conversations/chat-app');
    expect(conversation.status).toBe(200);
    expect(conversation.body.messages).toEqual([
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Oi' }] },
    ]);
    expect((await agent.get('/api/conversations')).body).toHaveLength(2);
  });
});
