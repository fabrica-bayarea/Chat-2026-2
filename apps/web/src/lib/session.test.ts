import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginError, login } from '@/lib/session'
import { getFriendlyErrorMessage } from '@/lib/chat'

describe('login', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda o cookie (credentials include) e nunca guarda token na página', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ aluno: { matricula: '12345', nome: 'João Silva' } }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await login('12345', 'senha')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/api\/auth\/login$/)
    expect(init.credentials).toBe('include')
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('mensagens claras para senha errada e bloqueio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    await expect(login('12345', 'errada')).rejects.toThrow('Matrícula ou senha inválidas.')

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })))
    await expect(login('12345', 'errada')).rejects.toBeInstanceOf(LoginError)
  })
})

describe('getFriendlyErrorMessage', () => {
  it('conversa de outra conta (403 FORBIDDEN)', () => {
    const error = new Error('{"error":"Esta conversa pertence a outra conta.","code":"FORBIDDEN"}')
    expect(getFriendlyErrorMessage(error)).toMatch(/pertence a outra conta/)
  })
})
