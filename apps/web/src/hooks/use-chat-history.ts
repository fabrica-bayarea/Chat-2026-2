import { useSyncExternalStore } from 'react'
import type { ChatMessage, Conversation, Feedback } from '@/types/chat'

const STORAGE_KEY = 'SUA_KEY'
const TITLE_MAX_LENGTH = 60

type Listener = () => void

/**
 * A tiny external store backed by localStorage.
 * Using `useSyncExternalStore` means components only re-render when the
 * slice they select actually changes, and multiple tabs stay in sync.
 */
function createHistoryStore() {
  let conversations: Conversation[] = read()
  const listeners = new Set<Listener>()

  function read(): Conversation[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? (parsed as Conversation[]) : []
    } catch {
      return []
    }
  }

  function commit(next: Conversation[]) {
    conversations = next
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (error) {
      // Quota exceeded or storage disabled (e.g. private mode) — keep in memory.
      console.warn('[chat-history] Failed to persist conversations', error)
    }
    listeners.forEach((listener) => listener())
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return
      conversations = read()
      listeners.forEach((listener) => listener())
    })
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => conversations,

    saveMessages(id: string, messages: ChatMessage[]) {
      if (messages.length === 0) return
      const now = Date.now()
      const existing = conversations.find((c) => c.id === id)

      if (existing) {
        commit(
          conversations.map((c) =>
            c.id === id ? { ...c, messages, updatedAt: now } : c,
          ),
        )
        return
      }

      commit([
        {
          id,
          title: deriveTitle(messages),
          createdAt: now,
          updatedAt: now,
          messages,
          feedback: {},
        },
        ...conversations,
      ])
    },

    setFeedback(id: string, messageId: string, value: Feedback | null) {
      commit(
        conversations.map((c) => {
          if (c.id !== id) return c
          const feedback = { ...c.feedback }
          if (value) feedback[messageId] = value
          else delete feedback[messageId]
          return { ...c, feedback }
        }),
      )
    },

    rename(id: string, title: string) {
      const trimmed = title.trim()
      if (!trimmed) return
      commit(conversations.map((c) => (c.id === id ? { ...c, title: trimmed } : c)))
    },

    remove(id: string) {
      commit(conversations.filter((c) => c.id !== id))
    },
  }
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  const text =
    firstUser?.parts
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ?? ''
  if (!text) return 'Nova conversa'
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH).trimEnd()}…` : text
}

export const chatHistory = createHistoryStore()

/** All conversations, most recently updated first. */
export function useConversations(): Conversation[] {
  return useSyncExternalStore(chatHistory.subscribe, chatHistory.getSnapshot)
}

/** A single conversation (or `undefined` for a new, unsaved chat). */
export function useConversation(id: string): Conversation | undefined {
  return useSyncExternalStore(chatHistory.subscribe, () =>
    chatHistory.getSnapshot().find((c) => c.id === id),
  )
}
