# Integração do RAG com o agente

Liga a recuperação da base institucional (`docs/rag-recuperacao.md`) ao chat do agente (EP-01, US-05). Toda pergunta enviada para `POST /api/chat` passa pela base antes de chegar ao modelo, e a interface mostra as fontes usadas.

O código fica em `apps/mastra-core/src/rag/knowledge-context.ts` e `apps/mastra-core/src/api/chat.stream.ts`.

## Fluxo

```text
última pergunta do usuário ──► busca na base ──► mensagem de sistema ──► agente (Ollama)
                                (retrieve.ts)     (knowledge-context.ts)
                                       │
                                       └──► fontes ──► eventos source-url / source-document ──► interface
```

1. `chat.stream.ts` pega o texto da **última** mensagem do usuário.
2. `knowledge-context.ts` busca os trechos com o mesmo retriever do `rag:search` (`RAG_TOP_K`, `RAG_MIN_SCORE`).
3. O resultado vira uma mensagem de sistema enviada ao agente junto com a conversa (`agent.stream(..., { system })`). As instruções fixas do agente continuam valendo.
4. As fontes são enviadas para a interface como partes `source-url` (páginas do site, com link) e `source-document` (documentos, com arquivo e página). O front mostra essas partes como "Fontes consultadas" embaixo da resposta.

## O que o agente recebe

| Situação | Mensagem de sistema | Fontes na tela |
|---|---|---|
| Trechos relevantes encontrados | `BASE DE CONHECIMENTO INSTITUCIONAL` com regras e os trechos numerados, cada um com `Fonte: <título> — <link>` | Sim, uma por página/documento |
| Nada acima de `RAG_MIN_SCORE` | Aviso de que nada foi encontrado e de que não deve apresentar nada como vindo da base | Não |
| Mensagem só com anexo (sem texto) | Mesmo aviso de nada encontrado; a busca nem é feita | Não |
| Base indisponível (Ollama, modelo de embedding não baixado, índice com erro) | Mesmo aviso de nada encontrado; o chat continua respondendo | Não |

Os trechos são tratados como **dados, não instruções**: a mensagem de sistema manda ignorar ordens escritas dentro deles.

## RAG e MCP separados

- O RAG só tem conteúdo **público** (site e documentos institucionais). Ele responde perguntas como horários da biblioteca, processo seletivo ou bolsas.
- Dados do aluno e operações (matrícula, notas, situação, financeiro) **nunca** vêm do RAG. Eles ficam com as ferramentas/MCP (`apps/mcp-server`). O prompt do agente e a mensagem de contexto dizem isso explicitamente.
- O código também é separado: `src/rag/` não conhece o MCP, e o MCP não passa pelo RAG.

## Logs

Só contagens e o tipo do erro, nunca a pergunta nem o conteúdo:

```text
[rag] 2 trecho(s) enviado(s) ao agente, 1 fonte(s).
[rag] nenhum trecho relevante para a pergunta.
[rag] busca falhou (unavailable); resposta segue sem a base.
```

## Limitações conhecidas

- A busca usa só a última mensagem. Uma pergunta de continuação curta ("e no sábado?") pode não achar o trecho certo.
- A busca acontece em toda mensagem, até em "oi". Custa um embedding (rápido) e, sem trecho relevante, o agente só recebe o aviso.
- A tela mostra as fontes **consultadas** (enviadas ao agente). Se o modelo decidir não usar um trecho, a fonte aparece mesmo assim.
- Se o Ollama cair com erro 5xx, o AI SDK tenta o embedding de novo algumas vezes antes de desistir, e isso atrasa a resposta em alguns segundos.

## Testes

```bash
pnpm --filter mastra-core test
```

- `src/api/chat-rag.test.ts`: integração com base LibSQL de verdade e Ollama falso. Confere o que chega no modelo (trechos e fontes no sistema), o que chega na tela (`source-url`/`source-document`), pergunta sem conteúdo relevante, modelo de embedding não baixado e segunda mensagem com histórico.
- `src/rag/knowledge-context.test.ts`: mensagem só com anexo, cancelamento durante a busca e log sem a pergunta.
