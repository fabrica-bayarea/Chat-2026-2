import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatInput, type SendPayload } from '@/components/chat/ChatInput'
import { EmptyState } from '@/components/chat/EmptyState'
import { MessageList } from '@/components/chat/MessageList'
import {
  saveConversationMessages,
  toServiceError,
  useConversationData,
  useConversationList,
} from '@/hooks/use-conversation-list'
import { filesToParts } from '@/lib/attachments'
import { getHistoryErrorMessage } from '@/lib/chat'
import { conversationService } from '@/services'
import type { ChatMessage, Conversation, Feedback } from '@/types/chat'

const transport = new DefaultChatTransport<ChatMessage>({ api: 'http://localhost:3000/api/chat' })

const STREAM_THROTTLE_MS = 40

type ChatProps = {
  chatId: string
  onNewChat: () => void
}

type ChatSessionProps = {
  chatId: string
  initial: Conversation | null
  onNewChat: () => void
}

export function Chat({ chatId, onNewChat }: ChatProps) {
  const { load, retry } = useConversationData(chatId)

  if (load.status === 'loading') {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader title={undefined} onNewChat={onNewChat} />
        <div className="flex flex-1 items-center justify-center" role="status">
          <p className="text-sm text-muted-foreground">Carregando conversa…</p>
        </div>
      </div>
    )
  }

  if (load.status === 'error') {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader title={undefined} onNewChat={onNewChat} />
        <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 sm:px-6">
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Não foi possível abrir a conversa</AlertTitle>
            <AlertDescription>
              <p>{getHistoryErrorMessage(load.error)}</p>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={retry}>
                  <RotateCcwIcon aria-hidden />
                  Tentar novamente
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return <ChatSession chatId={chatId} initial={load.conversation} onNewChat={onNewChat} />
}

function ChatSession({ chatId, initial, onNewChat }: ChatSessionProps) {
  const { items } = useConversationList()
  const title = items.find((item) => item.id === chatId)?.title ?? initial?.title
  const [initialMessages] = useState(() => initial?.messages ?? [])
  const [feedback, setFeedback] = useState<Record<string, Feedback>>(() => initial?.feedback ?? {})
  const hasInteracted = useRef(false)

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
    if (!hasInteracted.current || status === 'streaming') return
    saveConversationMessages(chatId, messages).catch((saveError: unknown) => {
      toast.warning(getHistoryErrorMessage(toServiceError(saveError)), { id: 'save-failed' })
    })
  }, [chatId, messages, status])

  const handleSend = useCallback(
    async ({ text, files }: SendPayload) => {
      hasInteracted.current = true
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
      hasInteracted.current = true
      clearError()
      void regenerate(messageId ? { messageId } : undefined)
    },
    [regenerate, clearError],
  )

  const handleFeedback = useCallback(
    (messageId: string, value: Feedback | null) => {
      const previous = feedback[messageId] ?? null

      const apply = (next: Feedback | null) =>
        setFeedback((current) => {
          const updated = { ...current }
          if (next) updated[messageId] = next
          else delete updated[messageId]
          return updated
        })

      apply(value)
      conversationService.setFeedback(chatId, messageId, value).catch(() => {
        apply(previous)
        toast.error('Não foi possível salvar a avaliação.')
      })
    },
    [chatId, feedback],
  )

  const handleStop = useCallback(() => void stop(), [stop])

  const hasMessages = messages.length > 0

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatHeader title={title} onNewChat={onNewChat} />

      {hasMessages ? (
        <MessageList
          messages={messages}
          status={status}
          error={error}
          feedback={feedback}
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