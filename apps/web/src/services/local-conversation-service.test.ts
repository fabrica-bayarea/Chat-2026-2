    import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
    import { ConversationServiceError } from '@/services/conversation-service'
    import { LocalConversationService } from '@/services/local-conversation-service'
    import type { ChatMessage } from '@/types/chat'

    const HISTORY_STORAGE_NAME = 'atlas.conversations.v1'
    
    function userMessage(text: string): ChatMessage {
    return { id: `u-${text}`, role: 'user', parts: [{ type: 'text', text }] }
    }

    function assistantMessage(text: string): ChatMessage {
    return { id: `a-${text}`, role: 'assistant', parts: [{ type: 'text', text }] }
    }

    function fileMessage(filename: string): ChatMessage {
    return {
        id: `f-${filename}`,
        role: 'user',
        parts: [
        {
            type: 'file',
            mediaType: 'application/pdf',
            filename,
            url: 'data:application/pdf;base64,AAAA',
        },
        ],
    }
    }

    describe('LocalConversationService', () => {
    let service: LocalConversationService

    beforeEach(() => {
        window.localStorage.clear()
        service = new LocalConversationService()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('retorna lista vazia quando não há conversas', async () => {
        expect(await service.list()).toEqual([])
    })

    it('cria a conversa ao salvar e deriva o título do texto', async () => {
        await service.saveMessages('c1', [userMessage('Qual o valor da mensalidade?')])

        const list = await service.list()
        expect(list).toHaveLength(1)
        expect(list[0]).toMatchObject({ id: 'c1', title: 'Qual o valor da mensalidade?' })
    })

    it('limita o tamanho do título', async () => {
        await service.saveMessages('c1', [userMessage('a'.repeat(100))])

        const [summary] = await service.list()
        expect(summary?.title).toHaveLength(61)
        expect(summary?.title.endsWith('…')).toBe(true)
    })

    it('usa o nome do arquivo como título quando não há texto', async () => {
        await service.saveMessages('c1', [fileMessage('edital.pdf')])

        const [summary] = await service.list()
        expect(summary?.title).toBe('📎 edital.pdf')
    })

    it('não cria conversa quando não há mensagens', async () => {
        await service.saveMessages('c1', [])

        expect(await service.list()).toEqual([])
    })

    it('devolve a conversa com as mensagens', async () => {
        const messages = [userMessage('Oi'), assistantMessage('Olá!')]
        await service.saveMessages('c1', messages)

        const conversation = await service.get('c1')
        expect(conversation.messages).toEqual(messages)
    })

    it('lança not_found para uma conversa inexistente', async () => {
        const promise = service.get('nao-existe')

        await expect(promise).rejects.toBeInstanceOf(ConversationServiceError)
        await expect(promise).rejects.toMatchObject({ code: 'not_found' })
    })

    it('atualiza as mensagens sem mudar título nem data de criação', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(1_000)
        await service.saveMessages('c1', [userMessage('Primeira')])

        vi.setSystemTime(2_000)
        await service.saveMessages('c1', [userMessage('Primeira'), assistantMessage('Resposta')])

        const conversation = await service.get('c1')
        expect(conversation.messages).toHaveLength(2)
        expect(conversation.title).toBe('Primeira')
        expect(conversation.createdAt).toBe(1_000)
        expect(conversation.updatedAt).toBe(2_000)
    })

    it('lista da conversa mais recente para a mais antiga, sem as mensagens', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(1_000)
        await service.saveMessages('c1', [userMessage('Antiga')])
        vi.setSystemTime(2_000)
        await service.saveMessages('c2', [userMessage('Recente')])

        const list = await service.list()
        expect(list.map((item) => item.id)).toEqual(['c2', 'c1'])
        expect('messages' in list[0]!).toBe(false)
    })

    it('renomeia e ignora títulos vazios', async () => {
        await service.saveMessages('c1', [userMessage('Original')])

        await service.rename('c1', '  Novo título  ')
        expect((await service.get('c1')).title).toBe('Novo título')

        await service.rename('c1', '   ')
        expect((await service.get('c1')).title).toBe('Novo título')
    })

    it('remove a conversa', async () => {
        await service.saveMessages('c1', [userMessage('Uma')])
        await service.saveMessages('c2', [userMessage('Duas')])

        await service.remove('c1')

        const list = await service.list()
        expect(list.map((item) => item.id)).toEqual(['c2'])
    })

    it('grava e remove a avaliação de uma resposta', async () => {
        await service.saveMessages('c1', [userMessage('Oi'), assistantMessage('Olá!')])

        await service.setFeedback('c1', 'a-Olá!', 'up')
        expect((await service.get('c1')).feedback).toEqual({ 'a-Olá!': 'up' })

        await service.setFeedback('c1', 'a-Olá!', null)
        expect((await service.get('c1')).feedback).toEqual({})
    })

    it('lê o histórico já salvo pela versão anterior', async () => {
        window.localStorage.setItem(
        HISTORY_STORAGE_NAME,
        JSON.stringify([
            {
            id: 'legado',
            title: 'Conversa antiga',
            createdAt: 1,
            updatedAt: 2,
            messages: [],
            feedback: {},
            },
        ]),
        )

        const list = await service.list()
        expect(list.map((item) => item.id)).toEqual(['legado'])
    })

    it('ignora dados corrompidos no armazenamento', async () => {
        window.localStorage.setItem(HISTORY_STORAGE_NAME, '{quebrado')

        expect(await service.list()).toEqual([])
    })

    it('lança storage_full quando o armazenamento está cheio', async () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota')
        })

        const promise = service.saveMessages('c1', [userMessage('Oi')])

        await expect(promise).rejects.toBeInstanceOf(ConversationServiceError)
        await expect(promise).rejects.toMatchObject({ code: 'storage_full' })
    })
    })