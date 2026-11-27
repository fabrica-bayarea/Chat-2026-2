import type { ConversationService } from '@/services/conversation-service'
import { HttpConversationService } from '@/services/http-conversation-service'

// O histórico fica no backend (PostgreSQL), não mais no localStorage
export const conversationService: ConversationService = new HttpConversationService()
