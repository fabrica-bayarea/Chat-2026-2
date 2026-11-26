import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';

// Qualquer coisa que entregue uma conexão: o Database do backend ou um pg.Pool (testes, script)
type Connectable = { connect(): Promise<PoolClient> };

// Migrations em SQL puro: arquivos NNN_nome.sql na pasta migrations/ da RAIZ do repositório,
// aplicados em ordem, cada um uma vez só, dentro de uma transação.
// Caminho a partir deste arquivo: src/database (ou dist/database) → apps/backend → raiz.
export const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../migrations/', import.meta.url));

// Trava para duas instâncias não migrarem ao mesmo tempo (número qualquer, fixo)
const MIGRATION_LOCK_ID = 727_001;

export async function runMigrations(pool: Connectable, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort();
  const applied: string[] = [];

  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        text        PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )
    `);

    const done = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const alreadyApplied = new Set(done.rows.map((row) => row.name));

    for (const file of files) {
      if (alreadyApplied.has(file)) continue;

      const sql = await readFile(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Falha na migration ${file}`, { cause: error });
      }
      applied.push(file);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
  return applied;
}
