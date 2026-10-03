import type { UIMessage } from 'ai'

/** Metadata attached to every message (set by the client for user messages and by the server for assistant messages). */
export type MessageMetadata = {
  createdAt?: number
  model?: string
}

export type ChatMessage = UIMessage<MessageMetadata>

export type Feedback = 'up' | 'down'

export type Conversation = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  /** Per assistant message feedback, keyed by message id. */
  feedback: Record<string, Feedback>
}

export type ChatRequestBody = {
  id: string
  messages: ChatMessage[]
}
