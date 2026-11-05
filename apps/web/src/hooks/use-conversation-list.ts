import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { conversationService } from '@/services'
import { ConversationServiceError } from '@/services/conversation-service'
import type { ChatMessage, Conversation, ConversationSummary } from '@/types/chat'

export function toServiceError(error: unknown): ConversationServiceError {
if (error instanceof ConversationServiceError) return error
return new ConversationServiceError('unknown', 'Erro inesperado.', { cause: error })
}

export type ListStatus = 'idle' | 'loading' | 'ready' | 'error'

type ListState = {
items: ConversationSummary[]
status: ListStatus
error: ConversationServiceError | null
}

let state: ListState = { items: [], status: 'idle', error: null }
const listeners = new Set<() => void>()

function setState(next: Partial<ListState>) {
state = { ...state, ...next }
listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
listeners.add(listener)
return () => {
    listeners.delete(listener)
}
}

let latestLoad = 0

export async function refreshConversations(): Promise<void> {
const current = ++latestLoad
if (state.status !== 'ready') setState({ status: 'loading', error: null })

try {
    const items = await conversationService.list()
    if (current !== latestLoad) return
    setState({ items, status: 'ready', error: null })
} catch (error) {
    if (current !== latestLoad) return
    setState({ status: 'error', error: toServiceError(error) })
}
}

export async function removeConversation(id: string): Promise<void> {
const previous = state.items
setState({ items: previous.filter((item) => item.id !== id) })
try {
    await conversationService.remove(id)
} catch (error) {
    setState({ items: previous })
    throw toServiceError(error)
}
}

export async function renameConversation(id: string, title: string): Promise<void> {
const previous = state.items
setState({ items: previous.map((item) => (item.id === id ? { ...item, title } : item)) })
try {
    await conversationService.rename(id, title)
} catch (error) {
    setState({ items: previous })
    throw toServiceError(error)
}
}

export async function saveConversationMessages(
id: string,
messages: ChatMessage[],
): Promise<void> {
try {
    await conversationService.saveMessages(id, messages)
} catch (error) {
    throw toServiceError(error)
}
await refreshConversations()
}

export function useConversationList() {
const snapshot = useSyncExternalStore(subscribe, () => state)

useEffect(() => {
    if (state.status === 'idle') void refreshConversations()
}, [])

return {
    ...snapshot,
    refresh: refreshConversations,
    remove: removeConversation,
    rename: renameConversation,
}
}

export type ConversationLoad =
| { status: 'loading' }
| { status: 'ready'; conversation: Conversation | null }
| { status: 'error'; error: ConversationServiceError }

const LOADING: ConversationLoad = { status: 'loading' }

export function useConversationData(id: string) {
const [result, setResult] = useState<{ id: string; value: ConversationLoad } | null>(null)
const [attempt, setAttempt] = useState(0)

useEffect(() => {
    let cancelled = false

    conversationService.get(id).then(
    (conversation) => {
        if (!cancelled) setResult({ id, value: { status: 'ready', conversation } })
    },
    (error: unknown) => {
        if (cancelled) return
        const serviceError = toServiceError(error)
        setResult({
        id,
        value:
            serviceError.code === 'not_found'
            ? { status: 'ready', conversation: null }
            : { status: 'error', error: serviceError },
        })
    },
    )

    return () => {
    cancelled = true
    }
}, [id, attempt])

const retry = useCallback(() => {
    setResult(null)
    setAttempt((value) => value + 1)
}, [])

const load = result?.id === id ? result.value : LOADING
return { load, retry }
}