import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module.js';

// Contas fictícias de desenvolvimento (src/auth/alunos.ts)
const JOAO = { matricula: '12345', senha: 'aluno-12345-dev' };
const MARIA = { matricula: '2023001', senha: 'aluno-2023001-dev' };

function sessionCookie(response: request.Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((value) => value.startsWith('chat_session='));
  expect(cookie, 'login não devolveu o cookie da sessão').toBeDefined();
  return cookie!;
}

describe('Autenticação de aluno (e2e)', () => {
  let app: INestApplication;

  // App novo a cada teste: o limite de tentativas fica em memória
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('login certo: cookie httponly com a sessão, sem token nem senha no corpo', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send(JOAO);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ aluno: { matricula: '12345', nome: 'João Silva' } });
    expect(JSON.stringify(response.body)).not.toContain('eyJ');

    const cookie = sessionCookie(response);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('senha errada e matrícula inexistente dão a mesma resposta 401', async () => {
    const senhaErrada = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ matricula: '12345', senha: 'errada' });
    const naoExiste = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ matricula: '00000', senha: 'qualquer' });

    expect(senhaErrada.status).toBe(401);
    expect(naoExiste.status).toBe(401);
    expect(senhaErrada.body.message).toBe(naoExiste.body.message);
    expect(senhaErrada.headers['set-cookie']).toBeUndefined();
  });

  it('corpo inválido: 400', async () => {
    for (const body of [{}, { matricula: '12345' }, { matricula: 12345, senha: 'x' }, { matricula: ' ', senha: 'x' }]) {
      const response = await request(app.getHttpServer()).post('/api/auth/login').send(body);
      expect(response.status).toBe(400);
    }
  });

  it('me: devolve o aluno da sessão e recusa sem cookie', async () => {
    const login = await request(app.getHttpServer()).post('/api/auth/login').send(MARIA);
    const cookie = sessionCookie(login).split(';')[0]!;

    const comCookie = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie);
    expect(comCookie.status).toBe(200);
    expect(comCookie.body).toEqual({ aluno: { matricula: '2023001', nome: 'Maria Souza' } });

    const semCookie = await request(app.getHttpServer()).get('/api/auth/me');
    expect(semCookie.status).toBe(401);
  });

  it('me: token alterado ou assinado com outro segredo é recusado', async () => {
    const login = await request(app.getHttpServer()).post('/api/auth/login').send(JOAO);
    const token = sessionCookie(login).split(';')[0]!.slice('chat_session='.length);

    // Troca a matrícula no payload sem refazer a assinatura
    const [header, payload, signature] = token.split('.');
    const forjado = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    forjado.sub = '2023001';
    const tokenAlterado = `${header}.${Buffer.from(JSON.stringify(forjado)).toString('base64url')}.${signature}`;

    const outroSegredo = await new JwtService({ secret: 'x'.repeat(40) }).signAsync({
      sub: '2023001',
      nome: 'Maria Souza',
      perfil: 'aluno',
    });

    for (const ruim of [tokenAlterado, outroSegredo, 'lixo']) {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `chat_session=${ruim}`);
      expect(response.status).toBe(401);
    }
  });

  it('logout apaga o cookie', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/logout');

    expect(response.status).toBe(204);
    const cookie = sessionCookie(response);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
  });

  it('5 senhas erradas bloqueiam a matrícula, mesmo com a senha certa depois', async () => {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ matricula: '12345', senha: `errada-${tentativa}` });
      expect(response.status).toBe(401);
    }

    const bloqueado = await request(app.getHttpServer()).post('/api/auth/login').send(JOAO);
    expect(bloqueado.status).toBe(429);

    // Outra matrícula não é afetada
    const outra = await request(app.getHttpServer()).post('/api/auth/login').send(MARIA);
    expect(outra.status).toBe(200);
  });
});
