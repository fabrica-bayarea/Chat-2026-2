import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConversationServiceError } from '@/services/conversation-service'
import { HttpConversationService } from '@/services/http-conversation-service'
import type { ChatMessage } from '@/types/chat'

type FetchCall = [string, RequestInit]

describe('HttpConversationService', () => {
  const service = new HttpConversationService()
  let fetchMock: ReturnType<typeof vi.fn>

  function respond(status: number, body?: unknown) {
    fetchMock.mockResolvedValueOnce(
      new Response(body === undefined ? null : JSON.stringify(body), { status }),
    )
  }

  function lastCall(): FetchCall {
    return fetchMock.mock.calls.at(-1) as FetchCall
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('grava a conversa no backend, com o cookie, e não usa o localStorage', async () => {
    const messages: ChatMessage[] = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Oi' }] },
      { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'Olá!' }] },
    ]
    respond(204)

    await service.saveMessages('chat-1', messages)

    const [url, init] = lastCall()
    expect(url).toMatch(/\/api\/conversations\/chat-1\/messages$/)
    expect(init.method).toBe('PUT')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(String(init.body))).toEqual({ messages })
    expect(window.localStorage.length).toBe(0)
  })

  it('lista e abre conversas pelo backend', async () => {
    respond(200, [{ id: 'chat-1', title: 'Oi', createdAt: 1, updatedAt: 2 }])
    expect(await service.list()).toHaveLength(1)
    expect(lastCall()[0]).toMatch(/\/api\/conversations$/)

    respond(200, { id: 'chat-1', title: 'Oi', createdAt: 1, updatedAt: 2, messages: [], feedback: {} })
    expect((await service.get('chat-1')).id).toBe('chat-1')
    expect(lastCall()[0]).toMatch(/\/api\/conversations\/chat-1$/)
  })

  it('renomeia, apaga e grava feedback nas rotas certas', async () => {
    respond(204)
    await service.rename('chat-1', '  Novo nome  ')
    expect(lastCall()[1].method).toBe('PATCH')
    expect(JSON.parse(String(lastCall()[1].body))).toEqual({ title: 'Novo nome' })

    respond(204)
    await service.remove('chat-1')
    expect(lastCall()[1].method).toBe('DELETE')

    respond(204)
    await service.setFeedback('chat-1', 'a1', 'up')
    expect(lastCall()[0]).toMatch(/\/api\/conversations\/chat-1\/messages\/a1\/feedback$/)
    expect(JSON.parse(String(lastCall()[1].body))).toEqual({ value: 'up' })
  })

  it('não chama o backend para lista vazia de mensagens nem título vazio', async () => {
    await service.saveMessages('chat-1', [])
    await service.rename('chat-1', '   ')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('traduz erros: 404 = not_found, falha de rede = network', async () => {
    respond(404, { message: 'Conversa não encontrada.' })
    await expect(service.get('nao-existe')).rejects.toMatchObject({ code: 'not_found' })

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const error = await service.list().catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ConversationServiceError)
    expect((error as ConversationServiceError).code).toBe('network')
  })
})
