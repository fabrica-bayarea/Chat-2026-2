# Integração do RAG com o agente

Liga a recuperação da base institucional (`docs/rag-recuperacao.md`) ao chat do agente (EP-01, US-05). Toda pergunta enviada para `POST /api/chat` passa pela base antes de chegar ao modelo, e o agente cita na resposta o título da fonte que usou.

O código fica em `apps/mastra-core/src/rag/knowledge-context.ts`, `apps/mastra-core/src/rag/question-parts.ts`, `apps/mastra-core/src/api/search-question.ts` e `apps/mastra-core/src/api/chat.stream.ts`.

## Fluxo

```text
pergunta do usuário ──► busca na base ──► mensagem de sistema ──► agente (Ollama)
                                (retrieve.ts)     (knowledge-context.ts)
                                       │
                                       └──► fontes ──► eventos source-url / source-document (no stream)
```

1. `search-question.ts` monta a pergunta da busca com o texto da **última** mensagem do usuário. Se ela for uma continuação curta (até 5 palavras, como "e no sábado?" ou "e o da Asa Sul?"), a pergunta anterior do usuário entra junto, para a busca saber do que se trata.
2. `question-parts.ts` divide a mensagem nas perguntas que ela contém: frases com "?" e perguntas ligadas por "e" seguido de palavra interrogativa ("como funciona a biblioteca **e como** falo com a ouvidoria?"). O relato em volta é ignorado, até 4 perguntas são buscadas e cada consulta é cortada em `RAG_QUERY_MAX_CHARS`, mantendo o final. Sem pergunta explícita, a mensagem inteira é a consulta.
3. `knowledge-context.ts` busca cada pergunta com o mesmo retriever do `rag:search` e junta os trechos alternando entre as perguntas, sem repetir, até 10 trechos. Assim todas as perguntas da mensagem chegam ao agente.
4. A busca é **híbrida** (`retrieval/retrieve.ts` e `retrieval/lexical.ts`): a busca semântica traz 60 candidatos e as palavras raras da pergunta ("Excelência", "Ceilândia") reordenam os `RAG_TOP_K` (padrão 5) com peso `RAG_LEXICAL_WEIGHT` (0,15). Só existe resposta na base se algum trecho passar de `RAG_MIN_SCORE` (0,69); a partir daí, um trecho até 0,08 abaixo entra se trouxer a maior parte das palavras-chave (ex.: "HORÁRIOS DE FUNCIONAMENTO" para "horário da biblioteca"). Sinônimos básicos ligam "endereço" a CEP/quadra/localização e "horário" a funcionamento.
5. Quando um trecho vem de uma página pequena (até `RAG_EXPAND_SOURCE_CHUNKS` trechos, padrão 3), os outros trechos da página entram junto.
6. Cada trecho vai ao agente com a linha "Contatos deste trecho (assunto): …" ou "nenhum", e o resultado vira uma mensagem de sistema enviada junto com a conversa (`agent.stream(..., { system })`). As instruções fixas do agente continuam valendo.
7. A resposta passa por um **filtro de contatos** (`api/contact-guard.ts`) antes de chegar à tela: e-mail ou telefone que não está nos trechos nem no que o usuário escreveu é trocado por "[contato não informado na base]"; contato que, na base, é de outro setor também sai (a linha fala da ouvidoria, mas o telefone só aparece no trecho da biblioteca); e a linha interna de contatos nunca é mostrada. O texto é liberado linha a linha.
8. A fonte chega ao usuário pela **citação no texto**: o prompt e a mensagem de contexto mandam o agente citar o título da fonte que usou. O servidor também manda as fontes no stream como partes `source-url` (páginas do site, com link) e `source-document` (documentos, com arquivo e página), mas a interface não mostra essas partes.

## Links no fim da resposta

O servidor acrescenta o bloco "Para conferir no site do IESB" (`api/site-links.ts`), com o próprio endereço de cada página, sem depender do modelo:

- resposta com base: até três páginas usadas na busca;
- na dúvida (o agente diz que não tem a informação ou manda procurar os canais oficiais): também o site oficial e o Fale Conosco. A busca do site (`?s=`) não é usada porque volta sem conteúdo para muitos termos;
- cumprimento e pedido fora do assunto: sem links.

O bloco sai do histórico enviado ao modelo, para ele não imitar.

## O que o agente recebe

| Situação | Mensagem de sistema | Fontes no stream |
|---|---|---|
| Trechos relevantes encontrados | `BASE DE CONHECIMENTO INSTITUCIONAL` com regras e os trechos numerados, cada um com `Fonte: <título> — <link>` | Sim, uma por página/documento |
| Nada acima de `RAG_MIN_SCORE` | Aviso de que nada foi encontrado e de que não deve apresentar nada como vindo da base | Não |
| Mensagem só com anexo (sem texto) | Mesmo aviso de nada encontrado; a busca nem é feita | Não |
| Base indisponível (Ollama, modelo de embedding não baixado, índice com erro) | Mesmo aviso de nada encontrado; o chat continua respondendo | Não |

Os trechos são tratados como **dados, não instruções**: a mensagem de sistema manda ignorar ordens escritas dentro deles.

## Ingestão por seção

As páginas do site são divididas pelos títulos `h1` a `h3` (`ingestion/extract.ts`) e cada trecho começa com o título da sua seção (`ingestion/chunk.ts`). Antes, um trecho juntava o fim da "BOLSA SANTANDER" (prazo 31/08/2026) com o começo da "BOLSA EXCELÊNCIA", e o agente atribuía o prazo de uma bolsa à outra. Depois de mudar a ingestão, é preciso rodar `rag:ingest` de novo.

## Verificação com o modelo real

Bateria de 17 perguntas (`qwen2.5:7b`, base do IESB com 157 trechos), com cada dado concreto da resposta (datas, horários, percentuais, valores, notas, CEP, telefones, e-mails) conferido contra os trechos enviados ao agente: **nenhum dado fora da base**. A busca acertou o trecho certo em 22 de 22 perguntas de teste e não encontrou nada nas 6 perguntas fora do domínio (capital da França, integral, piada, "oi", copa do mundo, código em Python).

## RAG e MCP separados

- O RAG só tem conteúdo **público** (site e documentos institucionais). Ele responde perguntas como horários da biblioteca, processo seletivo ou bolsas.
- Dados do aluno e operações (matrícula, notas, situação, financeiro) **nunca** vêm do RAG. Eles ficam com as ferramentas/MCP (`apps/mcp-server`). O prompt do agente e a mensagem de contexto dizem isso explicitamente.
- O código também é separado: `src/rag/` não conhece o MCP, e o MCP não passa pelo RAG.

## Decisões

**RAG no próprio agente, não como ferramenta MCP.** A #13 pede que RAG e MCP fiquem separados: o MCP (`apps/mcp-server`) é a porta para sistemas e dados transacionais do aluno, e o RAG só tem conteúdo público. Colocar a busca atrás do MCP misturaria os dois, dependeria do cliente MCP (#9, ainda fora da develop) e acrescentaria um processo a mais em cada pergunta.

**Busca sempre antes do modelo, não ferramenta que o modelo decide chamar.** O modelo de desenvolvimento (`llama3.2:3b`) é pequeno e não chama ferramentas de forma confiável. Buscando em toda pergunta, o comportamento é previsível e testável, e o aviso de "nada encontrado" impede o agente de inventar. Se o projeto passar a usar um modelo maior, dá para trocar por uma ferramenta do Mastra que chame o mesmo `findKnowledgeForQuestion`.

**Modelo, contexto e temperatura.** Nos testes reais com a base do IESB, o `llama3.2:3b` respondeu rápido (2 a 20 s), mas inventou detalhes em perguntas grandes (CEP, formas de ingresso, requisitos de bolsa). O `qwen2.5:7b` ficou preso aos trechos: deu endereços completos e corretos e disse "não tenho essa informação" quando o dado não estava na base. Por isso ele é o modelo recomendado (`LLM_MODEL=qwen2.5:7b`), com:

- `LLM_NUM_CTX=8192` (`num_ctx` do Ollama, ver [`limites-do-agente.md`](limites-do-agente.md)). Com 4096, perguntas grandes, histórico e trechos estouravam a janela e o Ollama cortava o começo do prompt, justamente as instruções do agente.
- `LLM_TEMPERATURE=0`. Com 0,2 o modelo associava o prazo de uma bolsa a outra e criava e-mails; com 0 as respostas repetiram o texto da base nas duas execuções de cada pergunta.
- `LLM_TIMEOUT_MS=120000`. Em CPU (i7 de 13ª geração, GPU de 4 GB), o 7B levou de 5 a 70 s; com o padrão anterior de 30 s as respostas grandes seriam cortadas.

**RAG continua em `apps/mastra-core`, sem package compartilhado.** Hoje só o `mastra-core` usa a ingestão e a recuperação. Um package em `packages/` exigiria build e configuração própria sem ganho agora. O código já está separado por contrato (`KnowledgeStore`, `createRetriever`, `buildKnowledgeContext`) e não depende do servidor HTTP nem do agente, então pode ser movido para `packages/rag` sem mudanças quando aparecer um segundo consumidor (por exemplo, o `mcp-server` ou o backend).

## Logs

Só contagens e o tipo do erro, nunca a pergunta nem o conteúdo:

```text
[rag] 2 pergunta(s), 6 trecho(s) enviado(s) ao agente, 3 fonte(s).
[rag] nenhum trecho relevante para a pergunta.
[rag] busca falhou (unavailable); resposta segue sem a base.
```

## Limitações conhecidas

- A continuação é detectada só pelo tamanho. Uma continuação longa ("e qual é o horário no sábado de manhã?") vai sozinha para a busca, e uma pergunta curta completa ("horário da biblioteca?") leva junto a anterior, o que pode trazer um trecho a mais.
- Nenhum modelo de linguagem dá garantia absoluta. Números, datas, valores e contatos são conferidos contra a base, mas o modelo ainda pode reescrever mal uma regra que recebeu certa (ex.: no desconto família, trocar "não vale para Odontologia" por "vale para cursos presenciais") ou omitir parte de um dado (o CEP no endereço). Para dados críticos, a resposta deve ser conferida na fonte citada.
- A similaridade mínima (`RAG_MIN_SCORE=0.69`) não pode baixar: perguntas sem relação com a base ("qual a capital da França?") chegam a 0,68. O reforço por palavras-chave compensa parte disso sem abrir para perguntas fora do domínio.
- O filtro de contatos só julga o setor quando a linha da resposta cita o nome da página ou da seção; uma linha que não cita setor nenhum mantém qualquer contato que exista na base.
- O próprio site tem informações divergentes (o FIES aparece como "até 50%" numa página e "até 95%" em outra); o agente repete o que encontra.
- A busca acontece em toda mensagem, até em "oi". Custa um embedding (rápido) e, sem trecho relevante, o agente só recebe o aviso.
- A citação depende do modelo: um modelo pequeno pode esquecer de citar a fonte ou citar de um jeito diferente.
- Se o Ollama cair com erro 5xx, o AI SDK tenta o embedding de novo algumas vezes antes de desistir, e isso atrasa a resposta em alguns segundos.

## Testes

```bash
pnpm --filter mastra-core test
```

- `src/api/chat-rag.test.ts`: integração com base LibSQL de verdade e Ollama falso. Confere o que chega no modelo (trechos e fontes no sistema), o que chega no stream (`source-url`/`source-document`), pergunta sem conteúdo relevante, modelo de embedding não baixado, segunda mensagem com histórico e pergunta curta de continuação.
- `src/rag/knowledge-context.test.ts`: mensagem só com anexo, cancelamento durante a busca, log sem a pergunta, busca de cada pergunta da mensagem e junção dos trechos.
- `src/rag/question-parts.test.ts`: divisão da mensagem em perguntas, relato ignorado, limite de perguntas e corte de consultas longas.
- `src/rag/retrieval/retrieve.test.ts` e `src/rag/libsql-store.test.ts`: expansão de páginas pequenas e busca dentro de uma fonte.
- `src/config/llm.config.test.ts`: janela de contexto enviada ao Ollama.
- `src/api/search-question.test.ts`: montagem da pergunta da busca (pergunta completa, continuação curta, mensagens só com anexo).
- `src/rag/contacts.test.ts` e `src/api/contact-guard.test.ts`: identificação de contatos, troca de contato inventado ou de outro setor, linha interna fora da tela.
- `src/rag/retrieval/lexical.test.ts`: palavras-chave, sinônimos e peso das palavras raras.
- `src/rag/ingestion/extract.test.ts` e `src/rag/ingestion/chunk.test.ts`: divisão por seção e título da seção em cada trecho.
