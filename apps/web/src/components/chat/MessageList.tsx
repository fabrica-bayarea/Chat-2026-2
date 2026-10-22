import { useEffect } from 'react'
import type { ChatStatus } from 'ai'
import { AlertCircleIcon, ArrowDownIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AssistantAvatar } from '@/components/chat/AssistantAvatar'
import { Message } from '@/components/chat/Message'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { useAutoScroll } from '@/hooks/use-auto-scroll'
import { getFriendlyErrorMessage } from '@/lib/chat'
import { cn } from '@/lib/utils'
import type { ChatMessage, Feedback } from '@/types/chat'

type MessageListProps = {
  messages: ChatMessage[]
  status: ChatStatus
  error: Error | undefined
  feedback: Record<string, Feedback>
  onRegenerate: (messageId?: string) => void
  onFeedback: (messageId: string, value: Feedback | null) => void
  onDismissError: () => void
}

export function MessageList({
  messages,
  status,
  error,
  feedback,
  onRegenerate,
  onFeedback,
  onDismissError,
}: MessageListProps) {
  const { containerRef, contentRef, isAtBottom, scrollToBottom } = useAutoScroll()

  const lastMessage = messages.at(-1)
  const isBusy = status === 'submitted' || status === 'streaming'
  const isAwaitingFirstToken = status === 'submitted' && lastMessage?.role === 'user'
  const lastAssistantId = lastMessage?.role === 'assistant' ? lastMessage.id : undefined

  // Always jump to the bottom when the user sends a message, even if they had scrolled up.
  useEffect(() => {
    if (lastMessage?.role === 'user') scrollToBottom('smooth')
  }, [lastMessage?.id, lastMessage?.role, scrollToBottom])

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      >
        <div
          ref={contentRef}
          role="log"
          aria-label="Mensagens da conversa"
          aria-relevant="additions"
          className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-10 sm:px-6"
        >
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isStreaming={isBusy && message.id === lastAssistantId}
              canRegenerate={!isBusy && message.id === lastAssistantId}
              feedback={feedback[message.id]}
              onRegenerate={onRegenerate}
              onFeedback={onFeedback}
            />
          ))}

          {isAwaitingFirstToken ? (
            <div className="flex animate-message-in gap-3 sm:gap-4">
              <AssistantAvatar className="mt-0.5" />
              <TypingIndicator />
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="animate-message-in">
              <AlertCircleIcon />
              <AlertTitle>Não foi possível concluir a resposta</AlertTitle>
              <AlertDescription>
                <p>{getFriendlyErrorMessage(error)}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onRegenerate()}>
                    <RotateCcwIcon aria-hidden />
                    Tentar novamente
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onDismissError}>
                    <XIcon aria-hidden />
                    Dispensar
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-all duration-200',
          isAtBottom ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
        )}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => scrollToBottom('smooth')}
          aria-label="Rolar até a mensagem mais recente"
          tabIndex={isAtBottom ? -1 : 0}
          className={cn('rounded-full bg-background shadow-md', !isAtBottom && 'pointer-events-auto')}
        >
          <ArrowDownIcon aria-hidden />
        </Button>
      </div>
    </div>
  )
}
