# Integração do RAG com o agente

Liga a recuperação da base institucional (`docs/rag-recuperacao.md`) ao chat do agente (EP-01, US-05). Toda pergunta enviada para `POST /api/chat` passa pela base antes de chegar ao modelo, e o agente cita na resposta o título da fonte que usou.

O código fica em `apps/mastra-core/src/rag/knowledge-context.ts`, `apps/mastra-core/src/api/search-question.ts` e `apps/mastra-core/src/api/chat.stream.ts`.

## Fluxo

```text
pergunta do usuário ──► busca na base ──► mensagem de sistema ──► agente (Ollama)
                                (retrieve.ts)     (knowledge-context.ts)
                                       │
                                       └──► fontes ──► eventos source-url / source-document (no stream)
```

1. `search-question.ts` monta a pergunta da busca com o texto da **última** mensagem do usuário. Se ela for uma continuação curta (até 4 palavras, como "e no sábado?"), a pergunta anterior do usuário entra junto, para a busca saber do que se trata.
2. `knowledge-context.ts` busca os trechos com o mesmo retriever do `rag:search` (`RAG_TOP_K`, `RAG_MIN_SCORE`).
3. O resultado vira uma mensagem de sistema enviada ao agente junto com a conversa (`agent.stream(..., { system })`). As instruções fixas do agente continuam valendo.
4. A fonte chega ao usuário pela **citação no texto**: o prompt e a mensagem de contexto mandam o agente citar o título da fonte que usou. O servidor também manda as fontes no stream como partes `source-url` (páginas do site, com link) e `source-document` (documentos, com arquivo e página), mas a interface não mostra essas partes.

## O que o agente recebe

| Situação | Mensagem de sistema | Fontes no stream |
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

## Decisões

**RAG no próprio agente, não como ferramenta MCP.** A #13 pede que RAG e MCP fiquem separados: o MCP (`apps/mcp-server`) é a porta para sistemas e dados transacionais do aluno, e o RAG só tem conteúdo público. Colocar a busca atrás do MCP misturaria os dois, dependeria do cliente MCP (#9, ainda fora da develop) e acrescentaria um processo a mais em cada pergunta.

**Busca sempre antes do modelo, não ferramenta que o modelo decide chamar.** O modelo de desenvolvimento (`llama3.2:3b`) é pequeno e não chama ferramentas de forma confiável. Buscando em toda pergunta, o comportamento é previsível e testável, e o aviso de "nada encontrado" impede o agente de inventar. Se o projeto passar a usar um modelo maior, dá para trocar por uma ferramenta do Mastra que chame o mesmo `findKnowledgeForQuestion`.

**RAG continua em `apps/mastra-core`, sem package compartilhado.** Hoje só o `mastra-core` usa a ingestão e a recuperação. Um package em `packages/` exigiria build e configuração própria sem ganho agora. O código já está separado por contrato (`KnowledgeStore`, `createRetriever`, `buildKnowledgeContext`) e não depende do servidor HTTP nem do agente, então pode ser movido para `packages/rag` sem mudanças quando aparecer um segundo consumidor (por exemplo, o `mcp-server` ou o backend).

## Logs

Só contagens e o tipo do erro, nunca a pergunta nem o conteúdo:

```text
[rag] 2 trecho(s) enviado(s) ao agente, 1 fonte(s).
[rag] nenhum trecho relevante para a pergunta.
[rag] busca falhou (unavailable); resposta segue sem a base.
```

## Limitações conhecidas

- A continuação é detectada só pelo tamanho. Uma continuação longa ("e qual é o horário no sábado de manhã?") vai sozinha para a busca, e uma pergunta curta completa ("horário da biblioteca?") leva junto a anterior, o que pode trazer um trecho a mais.
- A busca acontece em toda mensagem, até em "oi". Custa um embedding (rápido) e, sem trecho relevante, o agente só recebe o aviso.
- A citação depende do modelo: um modelo pequeno pode esquecer de citar a fonte ou citar de um jeito diferente.
- Se o Ollama cair com erro 5xx, o AI SDK tenta o embedding de novo algumas vezes antes de desistir, e isso atrasa a resposta em alguns segundos.

## Testes

```bash
pnpm --filter mastra-core test
```

- `src/api/chat-rag.test.ts`: integração com base LibSQL de verdade e Ollama falso. Confere o que chega no modelo (trechos e fontes no sistema), o que chega no stream (`source-url`/`source-document`), pergunta sem conteúdo relevante, modelo de embedding não baixado, segunda mensagem com histórico e pergunta curta de continuação.
- `src/rag/knowledge-context.test.ts`: mensagem só com anexo, cancelamento durante a busca e log sem a pergunta.
- `src/api/search-question.test.ts`: montagem da pergunta da busca (pergunta completa, continuação curta, mensagens só com anexo).
