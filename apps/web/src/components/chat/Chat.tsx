import { useCallback, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatInput } from '@/components/chat/ChatInput'
import { EmptyState } from '@/components/chat/EmptyState'
import { MessageList } from '@/components/chat/MessageList'
import { chatHistory, useConversation } from '@/hooks/use-chat-history'
import type { ChatMessage, Feedback } from '@/types/chat'

// One shared transport: it is stateless and avoids re-creating it per render.
const transport = new DefaultChatTransport<ChatMessage>({ api: 'http://localhost:3000/api/chat' })

/** Batches UI updates while tokens stream in, keeping long answers smooth. */
const STREAM_THROTTLE_MS = 40

const EMPTY_FEEDBACK: Record<string, Feedback> = {}

type ChatProps = {
  /** Stable id for this conversation. Remount (via `key`) to switch chats. */
  chatId: string
  onNewChat: () => void
}

export function Chat({ chatId, onNewChat }: ChatProps) {
  const conversation = useConversation(chatId)
  // Only seed useChat once; afterwards useChat owns the live message state.
  const [initialMessages] = useState(() => conversation?.messages ?? [])

  const { messages, sendMessage, regenerate, stop, status, error, clearError } =
    useChat<ChatMessage>({
      id: chatId,
      messages: initialMessages,
      transport,
      throttle: STREAM_THROTTLE_MS,
      onError: (err) => console.error('[chat]', err),
    })

  const isStreaming = status === 'submitted' || status === 'streaming'

  // Persist on every settled state (message sent, reply finished, stopped or errored).
  // Skipping the "streaming" phase avoids writing to localStorage on every token.
  useEffect(() => {
    if (status === 'streaming') return
    chatHistory.saveMessages(chatId, messages)
  }, [chatId, messages, status])

  const handleSend = useCallback(
    (text: string) => {
      clearError()
      void sendMessage({ text, metadata: { createdAt: Date.now() } })
    },
    [sendMessage, clearError],
  )

  const handleRegenerate = useCallback(
    (messageId?: string) => {
      clearError()
      void regenerate(messageId ? { messageId } : undefined)
    },
    [regenerate, clearError],
  )

  const handleFeedback = useCallback(
    (messageId: string, value: Feedback | null) => {
      chatHistory.setFeedback(chatId, messageId, value)
    },
    [chatId],
  )

  const handleStop = useCallback(() => void stop(), [stop])

  const hasMessages = messages.length > 0

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatHeader title={conversation?.title} onNewChat={onNewChat} />

      {hasMessages ? (
        <MessageList
          messages={messages}
          status={status}
          error={error}
          feedback={conversation?.feedback ?? EMPTY_FEEDBACK}
          onRegenerate={handleRegenerate}
          onFeedback={handleFeedback}
          onDismissError={clearError}
        />
      ) : (
        <EmptyState onSelectPrompt={handleSend} />
      )}

      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        hasMessages={hasMessages}
      />
    </div>
  )
}
