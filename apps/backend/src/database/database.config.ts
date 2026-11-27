export type DatabaseConfig = {
  url: string;
};

// Falha cedo: sem DATABASE_URL o histórico não tem onde ficar
export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const url = env.DATABASE_URL?.trim();
  if (!url || !/^postgres(ql)?:\/\//.test(url)) {
    throw new Error(
      'DATABASE_URL ausente ou inválida (ex.: postgres://usuario:senha@localhost:5433/banco). Veja apps/backend/.env.example.',
    );
  }
  return { url };
}
