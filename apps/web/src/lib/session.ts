import { useSyncExternalStore } from 'react'

// Sessão do aluno. O token fica num cookie httponly que o JavaScript NÃO lê:
// aqui só guardamos quem está logado (nome e matrícula) para mostrar na tela.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export type Aluno = { matricula: string; nome: string }

export type Session =
  | { status: 'loading' }
  | { status: 'visitor' }
  | { status: 'student'; aluno: Aluno }

type Listener = () => void

let session: Session = { status: 'loading' }
const listeners = new Set<Listener>()

function setSession(next: Session) {
  session = next
  listeners.forEach((listener) => listener())
}

export class LoginError extends Error {}

const LOGIN_MESSAGES: Record<number, string> = {
  400: 'Preencha a matrícula e a senha.',
  401: 'Matrícula ou senha inválidas.',
  429: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
}

// Pergunta ao backend quem está logado (o navegador manda o cookie sozinho)
export async function refreshSession(): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' })
    if (!response.ok) {
      setSession({ status: 'visitor' })
      return
    }
    const body = (await response.json()) as { aluno: Aluno }
    setSession({ status: 'student', aluno: body.aluno })
  } catch {
    // Backend fora do ar: o chat continua funcionando como visitante
    setSession({ status: 'visitor' })
  }
}

export async function login(matricula: string, senha: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matricula, senha }),
    })
  } catch {
    throw new LoginError('Sem conexão com o servidor. Tente novamente.')
  }

  if (!response.ok) {
    throw new LoginError(LOGIN_MESSAGES[response.status] ?? 'Não foi possível entrar agora. Tente novamente.')
  }
  const body = (await response.json()) as { aluno: Aluno }
  setSession({ status: 'student', aluno: body.aluno })
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  } finally {
    setSession({ status: 'visitor' })
  }
}

let started = false

function subscribe(listener: Listener) {
  listeners.add(listener)
  // Primeiro componente que olha a sessão: pergunta ao backend uma vez só.
  // O React chama subscribe fora do render, então o efeito colateral fica aqui.
  if (!started) {
    started = true
    void refreshSession()
  }
  return () => {
    listeners.delete(listener)
  }
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, () => session)
}
