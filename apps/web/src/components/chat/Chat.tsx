import { useCallback, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { toast } from 'sonner'
import { ChatInput, type SendPayload } from '@/components/chat/ChatInput'
import { filesToParts } from '@/lib/attachments'
import { EmptyState } from '@/components/chat/EmptyState'
import { MessageList } from '@/components/chat/MessageList'
import { chatHistory, useConversation } from '@/hooks/use-chat-history'
import type { ChatMessage, Feedback } from '@/types/chat'


const transport = new DefaultChatTransport<ChatMessage>({ api: 'http://localhost:3000/api/chat' })

const STREAM_THROTTLE_MS = 40

const EMPTY_FEEDBACK: Record<string, Feedback> = {}

type ChatProps = {
  
  chatId: string
  onNewChat: () => void
}

export function Chat({ chatId, onNewChat }: ChatProps) {
  const conversation = useConversation(chatId)
  
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

  
  useEffect(() => {
    if (status === 'streaming') return
    chatHistory.saveMessages(chatId, messages)
  }, [chatId, messages, status])

  const handleSend = useCallback(
  async ({ text, files }: SendPayload) => {
    clearError()
    const metadata = { createdAt: Date.now() }


    if (files.length === 0) {
      void sendMessage({ text, metadata })
      return
    }

    try {
      const parts = await filesToParts(files)
      void sendMessage(text ? { text, files: parts, metadata } : { files: parts, metadata })
    } catch {
      toast.error('Não foi possível ler os arquivos anexados.')
    }
  },
  [sendMessage, clearError],
)


  const handleSendPrompt = useCallback(
    (text: string) => handleSend({ text, files: [] }),
      [handleSend],
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
        <EmptyState onSelectPrompt={handleSendPrompt} />
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
