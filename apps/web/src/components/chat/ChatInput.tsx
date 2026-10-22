import {
  memo,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { ArrowUpIcon, FileTextIcon, PaperclipIcon, SquareIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ATTACHMENT_LIMITS, formatFileSize, getMediaType, isImage, validateFiles } from '@/lib/attachments'
import { cn } from '@/lib/utils'

export type SendPayload = {
  text: string
  files: File[]
}

type ChatInputProps = {
  onSend: (playload: SendPayload) => void
  onStop: () => void
  isStreaming: boolean
  hasMessages: boolean
  disabled?: boolean
}


type PendingAttachment = {
  id: string
  file: File
  previewUrl?: string 
}

const ACCEPT = [...ATTACHMENT_LIMITS.acceptedTypes, '.md', '.csv', '.txt'].join(',')

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
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]) // NOVO
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null) // NOVO
  const attachmentsRef = useRef<PendingAttachment[]>([]) // NOVO
  const hintId = useId()

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isStreaming && !disabled

  const placeholder = isStreaming
    ? 'Aguarde a resposta ou pressione parar…'
    : hasMessages
      ? 'Responder ao Atlas…'
      : 'Pergunte qualquer coisa ao Atlas…'

  
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`
  }, [value])

  useEffect(() => {
    if (!prefersCoarsePointer) textareaRef.current?.focus()
  }, [])

  
  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])


  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [])


  function addFiles(files: File[]) {
    const { accepted, errors } = validateFiles(
      files,
      attachments.map((item) => item.file),
    )

    errors.forEach((message) => toast.error(message))
    if (accepted.length === 0) return

    const newItems: PendingAttachment[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: isImage(getMediaType(file)) ? URL.createObjectURL(file) : undefined,
    }))
    setAttachments((prev) => [...prev, ...newItems])
  }

  
  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  
  function removeAttachment(id: string) {
    const target = attachments.find((item) => item.id === id)
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
    setAttachments((prev) => prev.filter((item) => item.id !== id))
  }

  function clearAttachments() {
    attachments.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
    setAttachments([])
  }

  function submit() {
  if (!canSend) return
  onSend({ text: value.trim(), files: attachments.map((item) => item.file) })
  setValue('')
  clearAttachments()
  textareaRef.current?.focus()
}

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return
    if (event.nativeEvent.isComposing || event.keyCode === 229) return

    const withModifier = event.metaKey || event.ctrlKey
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
          
          {attachments.length > 0 && (
            <ul role="list" aria-label="Anexos pendentes" className="flex flex-wrap gap-2 px-4 pt-4">
              {attachments.map((item) => (
                <li
                  key={item.id}
                  className="flex max-w-full items-center gap-2 rounded-xl border bg-muted/50 p-1.5 pr-2"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background">
                      <FileTextIcon className="size-5 text-muted-foreground" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block max-w-40 truncate text-sm font-medium">
                      {item.file.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatFileSize(item.file.size)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removeAttachment(item.id)}
                    aria-label={`Remover ${item.file.name}`}
                    className="shrink-0 rounded-full"
                  >
                    <XIcon aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}

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

          
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT}
                onChange={handleFileSelect}
                className="hidden"
                tabIndex={-1}
                aria-hidden
              />

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Anexar arquivo"
                      className="size-10 rounded-full sm:size-9"
                    />
                  }
                >
                  <PaperclipIcon className="size-4.5" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Anexar arquivo</TooltipContent>
              </Tooltip>

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