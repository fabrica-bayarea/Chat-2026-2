import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  // Lê apps/backend/.env se existir (recurso do próprio Node, sem biblioteca)
  try {
    process.loadEnvFile('.env');
  } catch {
    // Sem .env: usa só as variáveis do ambiente
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  // O front grava o histórico direto no backend, com o cookie que identifica o usuário
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  // A conversa é gravada inteira, com anexos (o front aceita até 25 MB por mensagem)
  app.useBodyParser('json', { limit: '30mb' });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
await bootstrap();
