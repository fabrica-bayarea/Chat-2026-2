# Limites do agente (tokens e janela de contexto)

Objetivo: o agente não gasta token à toa e cada resposta cabe na janela do modelo. Tudo se configura no `apps/mastra-core/.env` (veja o `.env.example`).

## O caminho de uma pergunta

```text
front (apps/web)            mastra-core                         Ollama
últimas 10 mensagens   →    janela de contexto            →    num_ctx = 4096
anexo sem base64            (10 mensagens, 6000 caracteres,     num_predict = 1024
                             só texto)                          (teto da resposta)
```

## Limites

| O quê | Variável | Padrão | Onde |
|---|---|---|---|
| Tamanho máximo da resposta | `LLM_MAX_TOKENS` | `1024` tokens | Ollama `num_predict` |
| Janela do modelo (entrada + resposta) | `LLM_NUM_CTX` | `4096` tokens | Ollama `num_ctx` |
| Mensagens da conversa que vão para o modelo | `CONTEXT_HISTORY_SIZE` | `10` | `context/context-window.ts` |
| Caracteres somados dessas mensagens | `CONTEXT_MAX_CHARS` | `6000` (~1500 tokens) | `context/context-window.ts` |
| Tempo máximo de uma resposta | `LLM_TIMEOUT_MS` | `30000` ms | `api/chat.stream.ts` |
| Chamadas ao modelo por resposta | (fixo) | `1` (`maxSteps: 1`, o agente não tem ferramentas) | `api/chat.stream.ts` |
| Corpo do pedido | `CHAT_MAX_BODY_BYTES` | `100000` bytes | `server.ts` |
| Mensagens por pedido | `CHAT_MAX_MESSAGES` | `50` | `api/chat.schema.ts` |
| Caracteres por mensagem do usuário | `CHAT_MAX_MESSAGE_CHARS` | `4000` | `api/chat.schema.ts` |

### Por que os limites vão em `options` do Ollama

O provider (`ollama-ai-provider-v2`) manda `temperature` e `max_output_tokens` soltos no corpo do `/api/chat`, e o Ollama **ignora** esses campos. Medido: com limite de 30 tokens, o modelo gerou 1609. Por isso `ollamaProviderOptions()` (`config/llm.config.ts`) manda `num_predict`, `num_ctx` e `temperature` dentro de `options`, que o Ollama respeita.

Sem `num_ctx`, o Ollama usa o padrão dele e, quando o prompt não cabe, **joga fora as mensagens antigas sem avisar**. Medido: uma conversa de ~11.700 tokens chegou ao modelo com 62.

## Janela de contexto de cada conversa

O histórico inteiro fica salvo no backend (ver [`historico-conversas.md`](historico-conversas.md)), mas o modelo não lê tudo a cada pergunta. A cada resposta, o mastra-core monta a janela (`buildContextWindow`):

1. Só texto: anexo vira a nota `[anexo não lido pelo assistente: nome.pdf]` (o modelo atual não lê arquivo, e o base64 gastaria muito token). Partes sem conteúdo (`step-start`) saem.
2. Só as últimas `CONTEXT_HISTORY_SIZE` mensagens.
3. Tira as mais antigas até a soma caber em `CONTEXT_MAX_CHARS`.
4. A última mensagem (a pergunta atual) sempre fica.

O front também ajuda: manda para o agente só as últimas 10 mensagens (`toAgentMessages` em `apps/web/src/lib/chat.ts`) e os anexos sem o conteúdo. Antes ele mandava a conversa inteira, e uma conversa longa (mais de 50 mensagens ou 100 KB) parava de funcionar com erro 400.

As respostas do assistente não entram no limite de `CHAT_MAX_MESSAGE_CHARS`. Quem corta o tamanho delas é a janela. Antes, uma resposta longa travava a mensagem seguinte com 400.

### A conta (llama3.2:3b, ~4 caracteres por token em português)

| Parte | Tokens |
|---|---|
| Instruções do agente | ~810 |
| Histórico (até 6000 caracteres) | até ~1500 |
| Resposta | até 1024 |
| **Total** | **~3350, cabe em 4096** |

Medido ao vivo: conversa de 29 mensagens com respostas longas e anexo → modelo recebeu 2 mensagens (5600 caracteres, sem base64), **2149 tokens de entrada e 1024 de saída**.

Para mudar a janela, mude junto: `LLM_NUM_CTX` ≥ instruções + `CONTEXT_MAX_CHARS`/4 + `LLM_MAX_TOKENS`. Janela maior usa mais memória da GPU/RAM e deixa a resposta mais lenta.

## Espaço do histórico por usuário

O backend limita o histórico de cada usuário a **100 MB** (`HISTORY_MAX_MB_PER_USER`). Detalhes em [`historico-conversas.md`](historico-conversas.md#espaço-por-usuário).
