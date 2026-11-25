import { randomBytes } from 'node:crypto';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // O módulo de autenticação não sobe sem segredo. Gerado a cada execução:
    // nenhum segredo fica escrito no repositório (o gitleaks barra isso).
    env: { AUTH_JWT_SECRET: randomBytes(32).toString('hex') },
  },
});
