import type {
ChatMessage,
Conversation,
ConversationSummary,
Feedback,
} from '@/types/chat'

export type ConversationErrorCode =
| 'network'
| 'not_found'
| 'unauthorized'
| 'storage_full'
| 'unknown'


export class ConversationServiceError extends Error {
readonly code: ConversationErrorCode

constructor(code: ConversationErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ConversationServiceError'
    this.code = code
}
}


export interface ConversationService {

list(): Promise<ConversationSummary[]>


get(id: string): Promise<Conversation>


create(): Promise<ConversationSummary>

saveMessages(id: string, messages: ChatMessage[]): Promise<void>

rename(id: string, title: string): Promise<void>

remove(id: string): Promise<void>


setFeedback(id: string, messageId: string, value: Feedback | null): Promise<void>
}