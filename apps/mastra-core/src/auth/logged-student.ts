import type { AuthConfig } from "../config/auth.config.js";

// Aluno identificado pelo backend a partir do cookie da sessão
export type LoggedStudent = {
  matricula: string;
  nome: string;
};

export const SESSION_COOKIE = "chat_session";

// Pega só o cookie da sessão: os outros cookies do navegador não são mandados para o backend
export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const piece of cookieHeader.split(";")) {
    const [name, ...rest] = piece.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || undefined;
  }
  return undefined;
}

// Pergunta ao backend de quem é a sessão. Quem decide é sempre o backend, que guarda o segredo
// do JWT. Qualquer falha (sem cookie, cookie inválido, backend fora) = visitante.
export async function findLoggedStudent(
  cookieHeader: string | undefined,
  config: AuthConfig,
): Promise<LoggedStudent | undefined> {
  const token = readSessionCookie(cookieHeader);
  if (!token || !config.apiUrl) return undefined;

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}/api/auth/me`, {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch {
    console.warn("[auth] backend de autenticação indisponível; seguindo como visitante.");
    return undefined;
  }

  if (response.status === 401) return undefined;
  if (!response.ok) {
    console.warn(`[auth] backend respondeu ${response.status}; seguindo como visitante.`);
    return undefined;
  }

  try {
    const body = (await response.json()) as { aluno?: Partial<LoggedStudent> };
    const { matricula, nome } = body.aluno ?? {};
    if (typeof matricula !== "string" || !matricula || typeof nome !== "string") return undefined;
    return { matricula, nome };
  } catch {
    return undefined;
  }
}
