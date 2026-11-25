import type { ChatMessage } from '@/types/chat'
import type { FileUIPart } from 'ai'
import type { ConversationServiceError } from '@/services/conversation-service'


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

export function getFileParts(message: ChatMessage): FileUIPart[] {
  return message.parts.filter((part): part is FileUIPart => part.type === 'file')
}

// Fonte da base de conhecimento usada na resposta (página do site ou documento)
export type MessageSource = {
  id: string
  title: string
  // Só páginas do site têm link
  url?: string
}

export function getSources(message: ChatMessage): MessageSource[] {
  const sources: MessageSource[] = []
  for (const part of message.parts) {
    if (part.type === 'source-url') {
      sources.push({ id: part.sourceId, title: part.title ?? part.url, url: part.url })
    }
    if (part.type === 'source-document') {
      sources.push({ id: part.sourceId, title: part.title })
    }
  }
  return sources
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


export function getFriendlyErrorMessage(error: Error): string {
  const message = error.message.toLowerCase()
  // Conversa que pertence a outra conta (ex.: saiu da conta e tentou continuar)
  if (message.includes('"forbidden"')) {
    return 'Esta conversa pertence a outra conta. Entre com a conta certa ou comece uma nova conversa.'
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
  }
  if (
    message.includes('413') ||
    message.includes('payload too large') ||
    message.includes('request entity too large')
  ) {
    return 'Os anexos são grandes demais para enviar. Tente arquivos menores.'
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

export function getHistoryErrorMessage(error: ConversationServiceError): string {
  switch (error.code) {
    case 'network':
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
    case 'unauthorized':
      return 'Você não tem permissão para acessar este histórico.'
    case 'storage_full':
      return 'O armazenamento do navegador está cheio. Esta conversa não será mantida ao recarregar a página.'
    case 'not_found':
      return 'Conversa não encontrada.'
    default:
      return 'Não foi possível acessar o histórico de conversas. Tente novamente.'
  }
}
