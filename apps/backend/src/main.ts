import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { loadAuthConfig } from './auth/auth.config.js';

async function bootstrap() {
  // Lê apps/backend/.env se existir (recurso do próprio Node, sem biblioteca)
  try {
    process.loadEnvFile('.env');
  } catch {
    // Sem .env: usa só as variáveis do ambiente
  }

  // Sem AUTH_JWT_SECRET o backend não sobe (falha aqui, antes de abrir a porta)
  loadAuthConfig();

  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // O front chama o login direto no backend e precisa mandar/receber o cookie da sessão
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  // 3001 por padrão: a 3000 é do mastra-core (API do chat)
  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
await bootstrap();
