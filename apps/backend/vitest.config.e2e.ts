import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Banco só de teste no Postgres do docker-compose (docker compose up -d postgres).
    // Os arquivos de teste usam o mesmo banco: um de cada vez.
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgres://chat:chat_dev@localhost:5433/chat_historico_test',
    },
  },
});
