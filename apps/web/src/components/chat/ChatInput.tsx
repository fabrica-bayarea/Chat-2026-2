import {
  memo,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { ArrowUpIcon, SquareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type ChatInputProps = {
  onSend: (text: string) => void
  onStop: () => void
  isStreaming: boolean
  hasMessages: boolean
  disabled?: boolean
}

const MAX_TEXTAREA_HEIGHT_PX = 220

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const prefersCoarsePointer =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export const ChatInput = memo(function ChatInput({
  onSend,
  onStop,
  isStreaming,
  hasMessages,
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hintId = useId()

  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  const placeholder = isStreaming
    ? 'Aguarde a resposta ou pressione parar…'
    : hasMessages
      ? 'Responder ao Atlas…'
      : 'Pergunte qualquer coisa ao Atlas…'

  // Auto-resize: grow with content up to a max height, then scroll.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`
  }, [value])

  useEffect(() => {
    if (!prefersCoarsePointer) textareaRef.current?.focus()
  }, [])

  function submit() {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
    textareaRef.current?.focus()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return
    // Don't submit while an IME (CJK input) is composing text.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return

    const withModifier = event.metaKey || event.ctrlKey
    // Cmd/Ctrl+Enter always sends. Plain Enter sends on desktop; on touch
    // devices Enter inserts a newline, like native messaging apps.
    if (withModifier || (!event.shiftKey && !prefersCoarsePointer)) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="bg-linear-to-t from-background via-background to-background/0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            'flex flex-col rounded-3xl border bg-card shadow-sm transition-[border-color,box-shadow] duration-200',
            'focus-within:border-ring/60 focus-within:shadow-md focus-within:ring-4 focus-within:ring-ring/10',
            disabled && 'opacity-60',
          )}
        >
          <label htmlFor="chat-input" className="sr-only">
            Mensagem
          </label>
          <Textarea
            id="chat-input"
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            aria-describedby={hintId}
            className="max-h-55 min-h-0 resize-none rounded-none border-0 bg-transparent px-5 pt-4 pb-1 text-[15px] leading-relaxed shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          />

          <div className="flex items-center justify-between gap-2 py-2.5 pr-2.5 pl-5">
            <p id={hintId} className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">
                <Kbd>Enter</Kbd> para enviar · <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> nova linha
              </span>
              <span className="sm:hidden">
                <Kbd>{isMac ? 'Cmd' : 'Ctrl'}</Kbd> + <Kbd>Enter</Kbd> para enviar
              </span>
            </p>

            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={onStop}
                      aria-label="Parar geração"
                      className="size-9 rounded-full"
                    />
                  }
                >
                  <SquareIcon className="size-3.5 fill-current" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Parar geração</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!canSend}
                      aria-label="Enviar mensagem"
                      className="size-9 rounded-full"
                    />
                  }
                >
                  <ArrowUpIcon className="size-4.5" strokeWidth={2.5} aria-hidden />
                </TooltipTrigger>
                <TooltipContent>
                  Enviar <span className="opacity-60">({isMac ? 'Cmd' : 'Ctrl'} + Enter)</span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          O Atlas pode cometer erros. Verifique informações importantes.
        </p>
      </form>
    </div>
  )
})

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border bg-muted px-1 py-px font-sans text-[11px] font-medium text-foreground/80">
      {children}
    </kbd>
  )
}
