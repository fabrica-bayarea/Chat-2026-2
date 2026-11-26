import {
  Global,
  Injectable,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import pg from 'pg';
import { loadDatabaseConfig } from './database.config.js';
import { runMigrations } from './migrations.js';

// Acesso ao PostgreSQL para o backend inteiro.
//
// O pool do pg fica num campo PRIVADO desta classe, e não registrado direto como provider:
// a telemetria do @nestjs/observe (main.ts) embrulha os métodos dos providers e, no pool
// cru, quebrava o pg ("Promise constructor cannot be invoked without 'new'").
@Injectable()
export class Database implements OnModuleInit, OnApplicationShutdown {
  readonly #pool = new pg.Pool({ connectionString: loadDatabaseConfig().url });

  query<Row extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]) {
    return this.#pool.query<Row>(text, params);
  }

  connect(): Promise<pg.PoolClient> {
    return this.#pool.connect();
  }

  // Ao subir o backend, aplica as migrations que faltam (pasta migrations/ da raiz).
  // Quem roda o projeto já tem as tabelas, sem passo extra.
  async onModuleInit() {
    const applied = await runMigrations(this);
    if (applied.length > 0) console.log(`[db] migrations aplicadas: ${applied.join(', ')}`);
  }

  async onApplicationShutdown() {
    await this.#pool.end();
  }
}

@Global()
@Module({
  providers: [Database],
  exports: [Database],
})
export class DatabaseModule {}
