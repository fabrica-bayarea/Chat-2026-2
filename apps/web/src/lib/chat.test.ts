import { describe, expect, it } from 'vitest'
import { AGENT_MAX_MESSAGES, toAgentMessages } from '@/lib/chat'
import type { ChatMessage } from '@/types/chat'

function text(id: string, role: ChatMessage['role'] = 'user'): ChatMessage {
  return { id, role, parts: [{ type: 'text', text: id }] }
}

describe('toAgentMessages', () => {
  it('manda para o agente só as últimas mensagens da conversa', () => {
    const conversation = Array.from({ length: 40 }, (_, i) => text(`m${i}`))

    const sent = toAgentMessages(conversation)

    expect(sent).toHaveLength(AGENT_MAX_MESSAGES)
    expect(sent.at(-1)?.id).toBe('m39')
    expect(sent[0]?.id).toBe(`m${40 - AGENT_MAX_MESSAGES}`)
  })

  it('manda o anexo sem o conteúdo em base64 e não altera a conversa original', () => {
    const conversation: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        parts: [
          { type: 'text', text: 'veja o edital' },
          { type: 'file', mediaType: 'application/pdf', filename: 'edital.pdf', url: 'data:application/pdf;base64,AAAA' },
        ],
      },
    ]

    const [sent] = toAgentMessages(conversation)

    expect(sent?.parts[1]).toEqual({ type: 'file', mediaType: 'application/pdf', filename: 'edital.pdf', url: '' })
    expect(conversation[0]?.parts[1]).toMatchObject({ url: 'data:application/pdf;base64,AAAA' })
  })
})
