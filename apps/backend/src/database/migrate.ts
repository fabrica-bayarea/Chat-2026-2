// Aplica as migrations pendentes: pnpm --filter backend db:migrate
import pg from 'pg';
import { loadDatabaseConfig } from './database.config.js';
import { runMigrations } from './migrations.js';

try {
  process.loadEnvFile('.env');
} catch {
  // Sem .env: usa só as variáveis do ambiente
}

const pool = new pg.Pool({ connectionString: loadDatabaseConfig().url });
try {
  const applied = await runMigrations(pool);
  console.log(
    applied.length > 0
      ? `[db] migrations aplicadas: ${applied.join(', ')}`
      : '[db] nenhuma migration pendente.',
  );
} catch (error) {
  console.error('[db] falha ao aplicar migrations:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
