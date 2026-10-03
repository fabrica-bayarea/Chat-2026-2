import type { ChatMessage } from '@/types/chat'

export function getMessageText(message: ChatMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join('\n\n')
}

export function getReasoningText(message: ChatMessage): string {
  return message.parts
    .map((part) => (part.type === 'reasoning' ? part.text : ''))
    .filter(Boolean)
    .join('\n\n')
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday ? timeFormatter.format(date) : dateTimeFormatter.format(date)
}

/** Maps raw transport/model errors to copy a user can act on. */
export function getFriendlyErrorMessage(error: Error): string {
  const message = error.message.toLowerCase()
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
  }
  if (message.includes('429') || message.includes('rate limit')) {
    return 'Muitas requisições em pouco tempo. Aguarde alguns segundos e tente novamente.'
  }
  if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
    return 'Não foi possível autenticar com o provedor de IA. Verifique a configuração da API.'
  }
  if (error.message && error.message.length < 160 && !message.startsWith('{')) {
    return error.message
  }
  return 'Algo deu errado ao gerar a resposta. Tente novamente.'
}
