import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { loadDatabaseConfig } from './database.config.js';

export const DATABASE_POOL = Symbol('DATABASE_POOL');

// Um pool de conexões PostgreSQL para o backend inteiro
@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () => new pg.Pool({ connectionString: loadDatabaseConfig().url }),
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
