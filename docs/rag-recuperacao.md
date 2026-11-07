# Recuperação da base institucional (RAG)

Camada que recebe a pergunta do usuário e devolve os trechos mais relevantes da base gerada pela ingestão (`docs/rag-ingestao.md`), junto com a identificação da fonte de cada um (EP-01, US-05). É a etapa que o agente vai usar para responder com base no conteúdo do IESB; a ligação com o agente fica para a próxima etapa.

O código fica em `apps/mastra-core/src/rag/retrieval/`.

## Fluxo

```text
pergunta ──► normalização ──► embedding ──► busca vetorial ──► filtro de relevância ──► validação da fonte ──► resultado
             (query.ts)       (search_query:)  (KnowledgeStore)   (RAG_MIN_SCORE)          (retrieve.ts)          + citações
```

| Etapa | Arquivo | O que faz |
|---|---|---|
| Consulta | `retrieval/query.ts` | Limpa espaços, rejeita consulta vazia ou acima do limite e gera o embedding com o prefixo de pergunta |
| Busca | `knowledge-store.ts` | Contrato `search(vetor, topK)`; base sem índice devolve lista vazia |
| Recuperação | `retrieval/retrieve.ts` | Filtra pela similaridade mínima, valida os metadados de cada trecho e monta o resultado |
| Citação | `retrieval/citation.ts` | Gera a referência legível (página do site com link, ou documento com página) |

## Uso

```ts
import { loadRagConfig } from "../config/rag.config.js";
import { createEmbedder } from "../rag/ingestion/embed.js";
import { createLibSQLKnowledgeStore } from "../rag/libsql-store.js";
import { createRetriever } from "../rag/retrieval/retrieve.js";

const config = loadRagConfig();
const retrieve = createRetriever({
  embed: createEmbedder(config, "query"), // prefixo de pergunta do nomic-embed-text
  store: await createLibSQLKnowledgeStore(config),
  topK: config.topK,
  minScore: config.minScore,
  queryMaxChars: config.queryMaxChars,
});

const result = await retrieve("Onde fica o campus de Ceilândia?");
```

Pelo terminal (com a ingestão já executada):

```bash
pnpm --filter mastra-core rag:search "Onde fica o campus de Ceilândia?"
```

## Resultado

```json
{
  "query": "Onde fica o campus de Ceilândia?",
  "found": true,
  "chunks": [
    {
      "text": "Estrutura Infraestrutura de ponta, estética diferenciada...",
      "score": 0.751,
      "source": {
        "sourceId": "https://www.iesb.br/estrutura/campus-ceilandia/",
        "origin": "site",
        "type": "html",
        "title": "Campus Ceilândia",
        "chunkIndex": 0,
        "totalChunks": 3,
        "collectedAt": "2026-11-07T13:30:29.686Z",
        "contentHash": "83a26c65..."
      },
      "citation": {
        "label": "Campus Ceilândia — iesb.br",
        "origin": "site",
        "url": "https://www.iesb.br/estrutura/campus-ceilandia/"
      }
    }
  ],
  "sources": [
    { "label": "Campus Ceilândia — iesb.br", "origin": "site", "url": "https://www.iesb.br/estrutura/campus-ceilandia/" }
  ]
}
```

- `chunks`: trechos relevantes, do mais parecido para o menos, com texto, similaridade (`score`, de 0 a 1), metadados da fonte e citação.
- `sources`: as fontes dos trechos sem repetição (uma por página ou documento), para citar na resposta.
- Em documentos, a citação traz o arquivo e a página quando houver: `guia uso ia (guia-uso-ia.pdf), p. 4`.

## Sem resultado relevante

A busca vetorial sempre devolve os trechos mais próximos, mesmo quando a pergunta não tem relação com a base. Por isso só entram no resultado os trechos com similaridade a partir de `RAG_MIN_SCORE`. Quando nenhum passa, ou quando a ingestão ainda não foi executada, o resultado vem com `found: false` e listas vazias: o agente deve responder que não tem a informação, sem inventar.

O valor padrão (`0.69`) foi calibrado com `nomic-embed-text` e a base atual (22 fontes, 126 chunks), comparando a melhor similaridade de 20 perguntas sobre o IESB e 20 fora do assunto:

| Grupo | Menor | Maior |
|---|---|---|
| Perguntas sobre o IESB | 0,670 | 0,836 |
| Perguntas fora do assunto | 0,597 | 0,687 |

Com `0.69`, 19 de 20 perguntas relevantes são atendidas e nenhuma fora do assunto passa. A que fica de fora é muito informal ("como faço pra me transferir pra cá"). A margem é pequena: se o modelo de embeddings ou o conteúdo da base mudar, o valor deve ser recalibrado.

## Origem das fontes

O resultado só traz fontes que existem na base. Cada trecho tem os metadados validados antes de entrar no resultado: texto, `sourceId`, origem (`site` ou `documento`), tipo e título são obrigatórios, e fontes do site precisam ter URL. Trecho fora desse formato é descartado e registrado no log (`[rag] trecho ... descartado`); nenhum dado de origem é completado ou inventado.

## Erros

| Situação | Comportamento |
|---|---|
| Consulta vazia ou acima de `RAG_QUERY_MAX_CHARS` | `RetrievalError` com `kind: "invalid_query"` |
| Ollama ou modelo indisponível | `RetrievalError` com `kind: "unavailable"` |
| Falha ao ler a base vetorial | `RetrievalError` com `kind: "unavailable"` |
| Base sem ingestão | Resultado com `found: false` |

## Variáveis

| Variável | Padrão | Descrição |
|---|---|---|
| `RAG_TOP_K` | `4` | Quantidade máxima de trechos devolvidos |
| `RAG_MIN_SCORE` | `0.69` | Similaridade mínima para um trecho ser relevante |
| `RAG_QUERY_MAX_CHARS` | `1000` | Tamanho máximo da pergunta |

As demais (`OLLAMA_BASE_URL`, `RAG_EMBEDDING_MODEL`, `RAG_VECTOR_DB_URL`, `RAG_INDEX_NAME`) são as mesmas da ingestão.

## Base vetorial trocável

A recuperação e a ingestão dependem só do contrato `KnowledgeStore` (`rag/knowledge-store.ts`), com três métodos: `reset`, `saveSource` e `search`. A implementação atual é LibSQL (`rag/libsql-store.ts`), escolhida apenas nos scripts. Para usar outra base, como PgVector, basta criar uma nova implementação do contrato e trocá-la nos scripts; o teste `knowledge-store.test.ts` usa uma implementação em memória para garantir isso.

## Limitações conhecidas

- Siglas podem atrapalhar: "Posso usar IA nos trabalhos?" encontra menos do que "Posso usar inteligência artificial nos trabalhos?".
- Páginas com muitas perguntas e respostas parecidas (ex.: Extensão Curricular) às vezes aparecem antes da página mais específica.

## Testes

```bash
pnpm --filter mastra-core test
```
