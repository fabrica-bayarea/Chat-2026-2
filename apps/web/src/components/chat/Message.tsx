import { memo, type ReactNode } from 'react'
import {
  BrainIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  RefreshCwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AssistantAvatar } from '@/components/chat/AssistantAvatar'
import { Markdown } from '@/components/chat/Markdown'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { formatMessageTime, getMessageText, getReasoningText } from '@/lib/chat'
import { cn } from '@/lib/utils'
import type { ChatMessage, Feedback } from '@/types/chat'

type MessageProps = {
  message: ChatMessage
  /** True only for the assistant message currently receiving tokens. */
  isStreaming: boolean
  /** Whether this message can be regenerated (the latest assistant reply while idle). */
  canRegenerate: boolean
  feedback?: Feedback
  onRegenerate: (messageId: string) => void
  onFeedback: (messageId: string, value: Feedback | null) => void
}

export const Message = memo(function Message(props: MessageProps) {
  return props.message.role === 'user' ? (
    <UserMessage message={props.message} />
  ) : (
    <AssistantMessage {...props} />
  )
})

function UserMessage({ message }: { message: ChatMessage }) {
  const text = getMessageText(message)
  const { copied, copy } = useCopyToClipboard()
  const createdAt = message.metadata?.createdAt

  return (
    <article
      aria-label="Sua mensagem"
      className="group/message flex animate-message-in flex-col items-end gap-1.5"
    >
      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-bubble px-4 py-2.5 leading-7 break-words whitespace-pre-wrap text-bubble-foreground sm:max-w-[75%]">
        {text}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100">
        {createdAt ? <Timestamp value={createdAt} /> : null}
        <ActionButton label={copied ? 'Copiado' : 'Copiar mensagem'} onClick={() => copy(text)}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </ActionButton>
      </div>
    </article>
  )
}

function AssistantMessage({
  message,
  isStreaming,
  canRegenerate,
  feedback,
  onRegenerate,
  onFeedback,
}: MessageProps) {
  const text = getMessageText(message)
  const reasoning = getReasoningText(message)
  const { copied, copy } = useCopyToClipboard()
  const createdAt = message.metadata?.createdAt
  const showActions = !isStreaming && text.length > 0

  // A reply that failed before producing any content; the error alert covers it.
  if (!text && !reasoning && !isStreaming) return null

  return (
    <article
      aria-label="Resposta do assistente"
      aria-busy={isStreaming}
      className="group/message flex animate-message-in gap-3 sm:gap-4"
    >
      <AssistantAvatar className="mt-0.5" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {reasoning ? <Reasoning text={reasoning} isStreaming={isStreaming && !text} /> : null}

        {text ? (
          <div className="min-w-0 text-[15px] leading-7 text-pretty break-words text-foreground">
            <Markdown>{text}</Markdown>
          </div>
        ) : isStreaming && !reasoning ? (
          <TypingIndicator />
        ) : null}

        {showActions ? (
          <div
            className={cn(
              'flex items-center gap-0.5 -ml-1.5 transition-opacity',
              canRegenerate
                ? 'opacity-100'
                : 'opacity-0 group-focus-within/message:opacity-100 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100',
            )}
          >
            <ActionButton label={copied ? 'Copiado' : 'Copiar resposta'} onClick={() => copy(text)}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </ActionButton>
            {canRegenerate ? (
              <ActionButton label="Regenerar resposta" onClick={() => onRegenerate(message.id)}>
                <RefreshCwIcon />
              </ActionButton>
            ) : null}
            <ActionButton
              label="Boa resposta"
              pressed={feedback === 'up'}
              onClick={() => onFeedback(message.id, feedback === 'up' ? null : 'up')}
            >
              <ThumbsUpIcon className={cn(feedback === 'up' && 'fill-current')} />
            </ActionButton>
            <ActionButton
              label="Resposta ruim"
              pressed={feedback === 'down'}
              onClick={() => onFeedback(message.id, feedback === 'down' ? null : 'down')}
            >
              <ThumbsDownIcon className={cn(feedback === 'down' && 'fill-current')} />
            </ActionButton>
            {createdAt ? <Timestamp value={createdAt} className="ml-1.5" /> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function Reasoning({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  return (
    <details className="group/reasoning text-sm text-muted-foreground">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md py-1 transition-colors select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
        <BrainIcon className="size-3.5" aria-hidden />
        <span className={cn(isStreaming && 'animate-pulse')}>
          {isStreaming ? 'Raciocinando…' : 'Raciocínio'}
        </span>
        <ChevronRightIcon
          className="size-3.5 transition-transform group-open/reasoning:rotate-90"
          aria-hidden
        />
      </summary>
      <div className="mt-2 border-l-2 pl-3 leading-relaxed whitespace-pre-wrap">{text}</div>
    </details>
  )
}

function Timestamp({ value, className }: { value: number; className?: string }) {
  return (
    <time
      dateTime={new Date(value).toISOString()}
      className={cn('px-1 text-xs text-muted-foreground/80 tabular-nums', className)}
    >
      {formatMessageTime(value)}
    </time>
  )
}

type ActionButtonProps = {
  label: string
  onClick: () => void
  pressed?: boolean
  children: ReactNode
}

function ActionButton({ label, onClick, pressed, children }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClick}
            aria-label={label}
            aria-pressed={pressed}
            className={cn(
              'text-muted-foreground hover:text-foreground',
              pressed && 'text-foreground',
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
