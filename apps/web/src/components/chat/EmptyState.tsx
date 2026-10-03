import { memo } from 'react'
import { CodeIcon, LightbulbIcon, PenLineIcon, TableIcon, type LucideIcon } from 'lucide-react'
import { AssistantAvatar } from '@/components/chat/AssistantAvatar'

type Suggestion = {
  icon: LucideIcon
  title: string
  description: string
  prompt: string
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: CodeIcon,
    title: 'Escrever código',
    description: 'Um hook React para debounce',
    prompt: 'Escreva um hook React em TypeScript chamado useDebounce, com exemplo de uso.',
  },
  {
    icon: LightbulbIcon,
    title: 'Explicar um conceito',
    description: 'Como funciona o event loop',
    prompt: 'Explique de forma clara como funciona o event loop do JavaScript.',
  },
  {
    icon: TableIcon,
    title: 'Comparar opções',
    description: 'REST vs GraphQL vs tRPC',
    prompt: 'Compare REST, GraphQL e tRPC em uma tabela com prós, contras e quando usar cada um.',
  },
  {
    icon: PenLineIcon,
    title: 'Revisar um texto',
    description: 'Deixar um e-mail mais profissional',
    prompt:
      'Reescreva este e-mail de forma mais profissional: "oi, preciso do relatório até amanhã, pode mandar?"',
  },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const EmptyState = memo(function EmptyState({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto">
      <div className="m-auto flex w-full max-w-3xl flex-col items-center gap-10 px-4 py-10 sm:px-6">
        <div className="flex animate-message-in flex-col items-center gap-5 text-center">
          <AssistantAvatar className="size-12 rounded-2xl [&_svg]:size-6" />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {greeting()}. Como posso ajudar?
            </h1>
            <p className="text-pretty text-muted-foreground">
              Pergunte, escreva ou explore ideias. Suas conversas ficam salvas neste navegador.
            </p>
          </div>
        </div>

        <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Sugestões">
          {SUGGESTIONS.map(({ icon: Icon, title, description, prompt }, index) => (
            <li
              key={title}
              className="animate-message-in"
              style={{ animationDelay: `${80 + index * 60}ms` }}
            >
              <button
                type="button"
                onClick={() => onSelectPrompt(prompt)}
                className="group flex h-full w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-all duration-200 outline-none hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{title}</span>
                  <span className="text-sm text-muted-foreground">{description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})
