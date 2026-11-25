import { describe, expect, it } from 'vitest'
import { getSources } from '@/lib/chat'
import type { ChatMessage } from '@/types/chat'

describe('getSources', () => {
  it('lê fontes do site (com link) e de documentos (sem link) na ordem da resposta', () => {
    const message: ChatMessage = {
      id: 'a-1',
      role: 'assistant',
      parts: [
        { type: 'step-start' },
        {
          type: 'source-url',
          sourceId: 'rag-1',
          url: 'https://www.iesb.br/biblioteca/',
          title: 'Biblioteca — iesb.br',
        },
        {
          type: 'source-document',
          sourceId: 'rag-2',
          mediaType: 'application/pdf',
          title: 'Guia de uso de IA (guia-uso-ia.pdf), p. 4',
          filename: 'guia-uso-ia.pdf',
        },
        { type: 'text', text: 'Resposta.' },
      ],
    }

    expect(getSources(message)).toEqual([
      { id: 'rag-1', title: 'Biblioteca — iesb.br', url: 'https://www.iesb.br/biblioteca/' },
      { id: 'rag-2', title: 'Guia de uso de IA (guia-uso-ia.pdf), p. 4' },
    ])
  })

  it('resposta sem fontes devolve lista vazia', () => {
    const message: ChatMessage = {
      id: 'a-2',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Oi!' }],
    }

    expect(getSources(message)).toEqual([])
  })
})
