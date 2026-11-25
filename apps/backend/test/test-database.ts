import pg from 'pg';
import { runMigrations } from '../src/database/migrations.js';

// Banco só de teste (criado se não existir), recriado do zero a cada arquivo de teste.
// Endereço em vitest.config.e2e.ts (DATABASE_URL), por padrão o Postgres do docker-compose.
export async function freshTestDatabase(): Promise<pg.Pool> {
  const url = new URL(process.env.DATABASE_URL!);
  const databaseName = url.pathname.slice(1);

  // Conecta no banco "postgres" para poder criar o banco de teste
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await admin.end();
  }

  const pool = new pg.Pool({ connectionString: url.toString() });
  await pool.query(
    'DROP TABLE IF EXISTS messages, conversations, users, schema_migrations CASCADE',
  );
  await runMigrations(pool);
  return pool;
}
