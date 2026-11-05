import type { ConversationService } from '@/services/conversation-service'
import { LocalConversationService } from '@/services/local-conversation-service'


export const conversationService: ConversationService = new LocalConversationService()