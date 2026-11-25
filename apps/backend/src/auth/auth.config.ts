export type AuthConfig = {
  // Segredo para assinar o JWT da sessão (HS256)
  jwtSecret: string;
  sessionHours: number;
  // Cookie só por HTTPS. Em produção sempre true; em localhost (http) precisa ser false.
  cookieSecure: boolean;
};

const MIN_SECRET_LENGTH = 32;

// Falha cedo: sem segredo forte o backend não sobe
export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const jwtSecret = env.AUTH_JWT_SECRET ?? '';
  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_JWT_SECRET ausente ou curta (mínimo ${MIN_SECRET_LENGTH} caracteres). Veja apps/backend/.env.example.`,
    );
  }

  const sessionHours = Number(env.AUTH_SESSION_HOURS ?? 8);
  if (!Number.isInteger(sessionHours) || sessionHours <= 0) {
    throw new Error('AUTH_SESSION_HOURS inválida: use um número inteiro positivo de horas.');
  }

  // Em produção o cookie é sempre Secure, mesmo se alguém configurar false por engano
  const isProduction = env.NODE_ENV === 'production';
  const cookieSecure = isProduction || env.AUTH_COOKIE_SECURE === 'true';

  return { jwtSecret, sessionHours, cookieSecure };
}
