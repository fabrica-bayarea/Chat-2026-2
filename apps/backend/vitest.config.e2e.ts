import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Segredo só de teste: o módulo de autenticação não sobe sem ele
    env: { AUTH_JWT_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres' },
  },
});
