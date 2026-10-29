import type { ChatMessage, Conversation, ConversationSummary, Feedback } from '@/types/chat'
import { ConversationServiceError, type ConversationService } from '@/services/conversation-service'


const HISTORY_STORAGE_NAME = 'atlas.conversations.v1'
const TITLE_MAX_LENGTH = 60


function readAll(): Conversation[] {
if (typeof window === 'undefined') return []
try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_NAME)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Conversation[]) : []
} catch {
    return []
}
}

function writeAll(conversations: Conversation[]): void {
try {
    window.localStorage.setItem(HISTORY_STORAGE_NAME, JSON.stringify(conversations))
} catch (error) {

    throw new ConversationServiceError(
    'storage_full',
    'O armazenamento do navegador está cheio.',
    { cause: error },
    )
}
}

function deriveTitle(messages: ChatMessage[]): string {
const firstUser = messages.find((m) => m.role === 'user')
const text =
    firstUser?.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() ?? ''

if (!text) {
    const file = firstUser?.parts.find((part) => part.type === 'file')
    const filename = file?.type === 'file' ? file.filename : undefined
    return filename ? `📎 ${filename}` : 'Nova conversa'
}

return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH).trimEnd()}…` : text
}

export class LocalConversationService implements ConversationService {
async list(): Promise<ConversationSummary[]> {
    return readAll()
    .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

async get(id: string): Promise<Conversation> {
    const found = readAll().find((c) => c.id === id)

    if (!found) throw new ConversationServiceError('not_found', 'Conversa não encontrada.')
    return found
}

async create(): Promise<ConversationSummary> {
    const now = Date.now()
    const conversation: Conversation = {
    id: crypto.randomUUID(),
    title: 'Nova conversa',
    createdAt: now,
    updatedAt: now,
    messages: [],
    feedback: {},
    }
    writeAll([conversation, ...readAll()])
    return { id: conversation.id, title: conversation.title, createdAt: now, updatedAt: now }
}


async saveMessages(id: string, messages: ChatMessage[]): Promise<void> {
    if (messages.length === 0) return
    const all = readAll()
    const now = Date.now()

    if (all.some((c) => c.id === id)) {
    writeAll(all.map((c) => (c.id === id ? { ...c, messages, updatedAt: now } : c)))
    return
    }

    writeAll([
    { id, title: deriveTitle(messages), createdAt: now, updatedAt: now, messages, feedback: {} },
    ...all,
    ])
}

async rename(id: string, title: string): Promise<void> {
    const trimmed = title.trim()
    if (!trimmed) return
    writeAll(readAll().map((c) => (c.id === id ? { ...c, title: trimmed } : c)))
}

async remove(id: string): Promise<void> {
    writeAll(readAll().filter((c) => c.id !== id))
}

async setFeedback(id: string, messageId: string, value: Feedback | null): Promise<void> {
    writeAll(
    readAll().map((c) => {
        if (c.id !== id) return c
        const feedback = { ...c.feedback }
        if (value) feedback[messageId] = value
        else delete feedback[messageId]
        return { ...c, feedback }
    }),
    )
}
}