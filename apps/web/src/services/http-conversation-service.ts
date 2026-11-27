import type { ChatMessage, Conversation, ConversationSummary, Feedback } from '@/types/chat'
import {
  ConversationServiceError,
  type ConversationErrorCode,
  type ConversationService,
} from '@/services/conversation-service'

// Histórico guardado no backend (PostgreSQL). O navegador só manda o cookie httponly que
// identifica o usuário; nenhuma conversa fica no localStorage.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'
const BASE = `${BACKEND_URL}/api/conversations`

function codeForStatus(status: number): ConversationErrorCode {
  if (status === 404) return 'not_found'
  if (status === 401 || status === 403) return 'unauthorized'
  return 'unknown'
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    })
  } catch (error) {
    throw new ConversationServiceError('network', 'Sem conexão com o servidor.', { cause: error })
  }

  if (!response.ok) {
    throw new ConversationServiceError(
      codeForStatus(response.status),
      `O servidor respondeu ${response.status}.`,
    )
  }
  return response
}

function conversationPath(id: string): string {
  return `/${encodeURIComponent(id)}`
}

export class HttpConversationService implements ConversationService {
  async list(): Promise<ConversationSummary[]> {
    const response = await request('')
    return (await response.json()) as ConversationSummary[]
  }

  async get(id: string): Promise<Conversation> {
    const response = await request(conversationPath(id))
    return (await response.json()) as Conversation
  }

  async create(): Promise<ConversationSummary> {
    const response = await request('', { method: 'POST', body: JSON.stringify({}) })
    return (await response.json()) as ConversationSummary
  }

  async saveMessages(id: string, messages: ChatMessage[]): Promise<void> {
    if (messages.length === 0) return
    await request(`${conversationPath(id)}/messages`, {
      method: 'PUT',
      body: JSON.stringify({ messages }),
    })
  }

  async rename(id: string, title: string): Promise<void> {
    const trimmed = title.trim()
    if (!trimmed) return
    await request(conversationPath(id), { method: 'PATCH', body: JSON.stringify({ title: trimmed }) })
  }

  async remove(id: string): Promise<void> {
    await request(conversationPath(id), { method: 'DELETE' })
  }

  async setFeedback(id: string, messageId: string, value: Feedback | null): Promise<void> {
    await request(`${conversationPath(id)}/messages/${encodeURIComponent(messageId)}/feedback`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    })
  }
}
