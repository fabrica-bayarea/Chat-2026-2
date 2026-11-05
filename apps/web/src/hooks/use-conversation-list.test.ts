    import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
    import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
    import {
    refreshConversations,
    saveConversationMessages,
    useConversationData,
    useConversationList,
    } from '@/hooks/use-conversation-list'
    import { conversationService } from '@/services'
    import { ConversationServiceError } from '@/services/conversation-service'
    import type { Conversation, ConversationSummary } from '@/types/chat'

    vi.mock('@/services', () => ({
    conversationService: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        saveMessages: vi.fn(),
        rename: vi.fn(),
        remove: vi.fn(),
        setFeedback: vi.fn(),
    },
    }))

    const service = vi.mocked(conversationService)

    const summaryA: ConversationSummary = { id: 'a', title: 'Conversa A', createdAt: 1, updatedAt: 3 }
    const summaryB: ConversationSummary = { id: 'b', title: 'Conversa B', createdAt: 1, updatedAt: 2 }

    const conversationA: Conversation = {
    id: 'a',
    title: 'Conversa A',
    createdAt: 1,
    updatedAt: 3,
    messages: [],
    feedback: {},
    }

    function ids(items: ConversationSummary[]) {
    return items.map((item) => item.id)
    }

    beforeEach(async () => {
    vi.clearAllMocks()
    service.list.mockResolvedValue([])
    await refreshConversations()
    })

    afterEach(() => {
    cleanup()
    })

    describe('useConversationList', () => {
    it('carrega e expõe a lista de conversas', async () => {
        service.list.mockResolvedValue([summaryA, summaryB])
        const { result } = renderHook(() => useConversationList())

        await act(async () => {
        await result.current.refresh()
        })

        expect(result.current.status).toBe('ready')
        expect(ids(result.current.items)).toEqual(['a', 'b'])
    })

    it('expõe o erro quando a listagem falha', async () => {
        service.list.mockRejectedValue(new ConversationServiceError('network', 'sem rede'))
        const { result } = renderHook(() => useConversationList())

        await act(async () => {
        await result.current.refresh()
        })

        expect(result.current.status).toBe('error')
        expect(result.current.error?.code).toBe('network')
    })

    it('remove da lista antes de a confirmação chegar', async () => {
        service.list.mockResolvedValue([summaryA, summaryB])
        const { result } = renderHook(() => useConversationList())
        await act(async () => {
        await result.current.refresh()
        })

        let resolveRemove: () => void = () => undefined
        service.remove.mockReturnValue(
        new Promise<void>((resolve) => {
            resolveRemove = resolve
        }),
        )

        let pending: Promise<void> = Promise.resolve()
        act(() => {
        pending = result.current.remove('a')
        })
        expect(ids(result.current.items)).toEqual(['b'])

        await act(async () => {
        resolveRemove()
        await pending
        })
        expect(ids(result.current.items)).toEqual(['b'])
    })

    it('restaura a lista quando a exclusão falha', async () => {
        service.list.mockResolvedValue([summaryA, summaryB])
        service.remove.mockRejectedValue(new ConversationServiceError('network', 'sem rede'))
        const { result } = renderHook(() => useConversationList())
        await act(async () => {
        await result.current.refresh()
        })

        await act(async () => {
        await expect(result.current.remove('a')).rejects.toMatchObject({ code: 'network' })
        })

        expect(ids(result.current.items)).toEqual(['a', 'b'])
    })

    it('restaura o título quando a renomeação falha', async () => {
        service.list.mockResolvedValue([summaryA])
        service.rename.mockRejectedValue(new ConversationServiceError('network', 'sem rede'))
        const { result } = renderHook(() => useConversationList())
        await act(async () => {
        await result.current.refresh()
        })

        await act(async () => {
        await expect(result.current.rename('a', 'Outro')).rejects.toMatchObject({ code: 'network' })
        })

        expect(result.current.items[0]?.title).toBe('Conversa A')
    })
    })

    describe('saveConversationMessages', () => {
    it('salva e recarrega a lista', async () => {
        service.saveMessages.mockResolvedValue(undefined)
        service.list.mockResolvedValue([summaryA])
        const { result } = renderHook(() => useConversationList())

        await act(async () => {
        await saveConversationMessages('a', [])
        })

        expect(service.saveMessages).toHaveBeenCalledWith('a', [])
        expect(ids(result.current.items)).toEqual(['a'])
    })

    it('padroniza o erro quando o salvamento falha', async () => {
        service.saveMessages.mockRejectedValue(new Error('falha qualquer'))

        await expect(saveConversationMessages('a', [])).rejects.toMatchObject({ code: 'unknown' })
    })
    })

    describe('useConversationData', () => {
    it('começa carregando e termina com a conversa', async () => {
        service.get.mockResolvedValue(conversationA)
        const { result } = renderHook(() => useConversationData('a'))

        expect(result.current.load.status).toBe('loading')
        await waitFor(() => expect(result.current.load.status).toBe('ready'))
        expect(result.current.load).toEqual({ status: 'ready', conversation: conversationA })
    })

    it('trata conversa inexistente como chat novo', async () => {
        service.get.mockRejectedValue(new ConversationServiceError('not_found', 'não existe'))
        const { result } = renderHook(() => useConversationData('novo'))

        await waitFor(() => expect(result.current.load.status).toBe('ready'))
        expect(result.current.load).toEqual({ status: 'ready', conversation: null })
    })

    it('expõe o erro e permite tentar de novo', async () => {
        service.get
        .mockRejectedValueOnce(new ConversationServiceError('network', 'sem rede'))
        .mockResolvedValueOnce(conversationA)
        const { result } = renderHook(() => useConversationData('a'))

        await waitFor(() => expect(result.current.load.status).toBe('error'))

        act(() => {
        result.current.retry()
        })

        await waitFor(() => expect(result.current.load.status).toBe('ready'))
    })

    it('ignora a resposta atrasada de outra conversa', async () => {
        let resolveFirst: (value: Conversation) => void = () => undefined
        service.get.mockImplementation((id: string) =>
        id === 'a'
            ? new Promise<Conversation>((resolve) => {
                resolveFirst = resolve
            })
            : Promise.resolve({ ...conversationA, id: 'b', title: 'Conversa B' }),
        )

        const { result, rerender } = renderHook(({ id }) => useConversationData(id), {
        initialProps: { id: 'a' },
        })
        rerender({ id: 'b' })

        await waitFor(() => expect(result.current.load.status).toBe('ready'))
        await act(async () => {
        resolveFirst(conversationA)
        })

        expect(result.current.load).toMatchObject({
        status: 'ready',
        conversation: { id: 'b' },
        })
    })
    })