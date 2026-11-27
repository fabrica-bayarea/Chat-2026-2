export type HistoryConfig = {
  maxBytesPerUser: number;
};

const MB = 1024 * 1024;
const DEFAULT_MAX_MB_PER_USER = 100;

// Espaço máximo do histórico de cada usuário (mensagens e anexos somados)
export function loadHistoryConfig(env: NodeJS.ProcessEnv = process.env): HistoryConfig {
  const raw = env.HISTORY_MAX_MB_PER_USER?.trim();
  const mb = raw ? Number(raw) : DEFAULT_MAX_MB_PER_USER;
  if (!Number.isFinite(mb) || mb <= 0) {
    throw new Error('HISTORY_MAX_MB_PER_USER inválida: use um número de MB maior que zero (ex.: 100).');
  }
  return { maxBytesPerUser: Math.floor(mb * MB) };
}
