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

// Quantas mensagens do fim da conversa vão para o agente a cada pergunta.
// O mastra-core usa só as últimas (janela de contexto) e não lê o conteúdo dos anexos.
// Mandar a conversa inteira, com anexos em base64, deixava o pedido pesado e, numa
// conversa longa, passava do limite do servidor (50 mensagens / 100 KB) e dava erro.
export const AGENT_MAX_MESSAGES = 10

export function toAgentMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-AGENT_MAX_MESSAGES).map((message) => ({
    ...message,
    // Anexo vai só com nome e tipo; o arquivo continua salvo no histórico
    parts: message.parts.map((part) => (part.type === 'file' ? { ...part, url: '' } : part)),
  }))
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
      return 'O espaço do seu histórico acabou. Exclua conversas antigas para continuar salvando.'
    case 'not_found':
      return 'Conversa não encontrada.'
    default:
      return 'Não foi possível acessar o histórico de conversas. Tente novamente.'
  }
}
