import { memo } from 'react'
import {
  BookOpenIcon,
  FileTextIcon,
  LightbulbIcon,
  MessageSquareIcon,
  type LucideIcon,
} from 'lucide-react'
import { AssistantAvatar } from '@/components/chat/AssistantAvatar'

type Suggestion = {
  icon: LucideIcon
  title: string
  description: string
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: MessageSquareIcon,
    title: 'Tirar dúvidas',
    description: 'Pergunte sobre qualquer conceito da matéria',
  },
  {
    icon: FileTextIcon,
    title: 'Resumir material',
    description: 'Peça um resumo do conteúdo',
  },
  {
    icon: LightbulbIcon,
    title: 'Preparar para prova',
    description: 'Simule perguntas de prova',
  },
  {
    icon: BookOpenIcon,
    title: 'Aprofundar tema',
    description: 'Explore tópicos em mais detalhes',
  },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const EmptyState = memo(function EmptyState() {
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
          {SUGGESTIONS.map(({ icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="flex animate-message-in items-start gap-3 rounded-lg border bg-card p-4"
              style={{ animationDelay: `${80 + index * 60}ms` }}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-chart-2/10 text-chart-2">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{title}</span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})