# Ingestão da base institucional (RAG)

Pipeline que coleta conteúdos públicos do IESB e os prepara para a busca semântica do agente (EP-01, US-05). Nesta primeira versão a ingestão é executada manualmente, uma vez, para validar o fluxo. A busca desses chunks pelo agente fica para a próxima etapa.

O código fica em `apps/mastra-core/src/rag/`.

## Fluxo

```text
fontes ──► coleta ──► extração ──► limpeza ──► chunks ──► metadados ──► embeddings ──► base vetorial
(sources.ts) (collect)  (extract)   (normalize)  (chunk)    (metadata)     (embed)       (libsql-store)
```

| Etapa | Arquivo | O que faz |
|---|---|---|
| Fontes | `rag/sources.ts` | Lista fixa de páginas públicas do iesb.br |
| Coleta | `rag/ingestion/collect.ts` | Baixa as páginas e lê os arquivos de `data/documentos/` |
| Extração | `rag/ingestion/extract.ts` | HTML (sem cabeçalho, menu e rodapé), PDF (uma parte por página), DOCX e DOC |
| Limpeza | `rag/ingestion/normalize.ts` | Unicode NFC, espaços, caracteres invisíveis, hifenização e quebras de linha do PDF, número de página, pontilhado de sumário |
| Chunks | `rag/ingestion/chunk.ts` | Divisão recursiva (`@mastra/rag`) por parágrafo, linha e frase; um chunk nunca mistura páginas |
| Metadados | `rag/ingestion/metadata.ts` | Monta os metadados de rastreabilidade e o id de cada chunk |
| Embeddings | `rag/ingestion/embed.ts` | Gera os vetores com um modelo de embeddings do Ollama |
| Armazenamento | `rag/libsql-store.ts` | Grava em um arquivo LibSQL local (`@mastra/libsql`), seguindo o contrato de `rag/knowledge-store.ts` |
| Orquestração | `rag/ingestion/pipeline.ts` | Executa as etapas por fonte e consolida o resumo |

## Fontes

- **Site institucional:** as páginas em `SITE_PAGES` (`rag/sources.ts`). Para incluir uma página, adicione a URL na lista.
- **Documentos:** todo arquivo `.pdf`, `.docx` ou `.doc` dentro de `apps/mastra-core/data/documentos/` (subpastas incluídas). Outras extensões são ignoradas.

Páginas que dependem de JavaScript para montar o conteúdo (ex.: `/matricule-se/documentos/`) ou que redirecionam para outros domínios (ex.: `/vestibular/`) ficaram de fora, porque não têm o texto no HTML.

## Metadados de cada chunk

| Campo | Descrição |
|---|---|
| `text` | Texto do chunk, devolvido junto com o resultado da busca |
| `sourceId` | URL da página ou caminho do documento relativo a `data/documentos/` |
| `origin` | `site` ou `documento` |
| `type` | `html`, `pdf`, `docx` ou `doc` |
| `title` | Título da página ou do documento |
| `page` | Página do PDF (apenas PDF) |
| `chunkIndex` / `totalChunks` | Posição do chunk dentro da fonte |
| `collectedAt` | Data e hora da coleta (ISO 8601) |
| `contentHash` | SHA-256 do texto do chunk |

O id do chunk é o SHA-256 de `sourceId#chunkIndex`, então reprocessar a mesma fonte gera os mesmos ids.

## Como executar

Pré-requisitos: [Ollama](https://ollama.com/download) rodando e o modelo de embeddings baixado.

```bash
ollama pull nomic-embed-text
cp apps/mastra-core/.env.example apps/mastra-core/.env   # se ainda não existir
pnpm --filter mastra-core rag:ingest
```

Variáveis (todas opcionais, com os valores padrão do `.env.example`):

| Variável | Padrão | Descrição |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434/api` | API do Ollama |
| `RAG_EMBEDDING_MODEL` | `nomic-embed-text` | Modelo de embeddings |
| `RAG_VECTOR_DB_URL` | `file:./data/rag.db` | Arquivo da base vetorial (relativo a `apps/mastra-core`) |
| `RAG_INDEX_NAME` | `base_institucional` | Nome do índice |
| `RAG_DOCUMENTS_DIR` | `./data/documentos` | Pasta dos documentos |
| `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` | `1000` / `150` | Tamanho e sobreposição dos chunks, em caracteres |
| `RAG_FETCH_TIMEOUT_MS` | `15000` | Tempo máximo para baixar cada página |

A base gerada (`data/rag.db`) não é versionada.

## Tratamento de falhas

- **Falha em uma fonte** (página fora do ar, timeout, arquivo corrompido, arquivo sem texto extraível, como PDF digitalizado): a fonte é registrada com a etapa e o motivo, e a ingestão segue com as demais. O resumo final lista todas as falhas.
- **Ollama indisponível ou modelo não baixado:** a ingestão é interrompida antes de apagar o índice, preservando a base anterior.
- **Erro ao gravar na base:** a ingestão é interrompida, para não deixar a base pela metade.
- O processo termina com código 1 quando é interrompido ou quando nenhuma fonte é processada.

Exemplo de saída:

```text
[rag] iniciando ingestão: 18 páginas e 6 documentos
[rag] https://www.iesb.br/o-iesb/: 9 chunks
...
[rag] falha em corrompido.pdf (extracao): arquivo PDF inválido ou corrompido
[rag] ingestão concluída: 22 de 24 fontes, 126 chunks salvos em file:./data/rag.db (índice base_institucional)
[rag] 2 fontes não foram processadas:
- corrompido.pdf (extracao): arquivo PDF inválido ou corrompido
- digitalizado-sem-texto.pdf (extracao): nenhum texto extraível (o arquivo pode ser uma imagem ou um PDF digitalizado)
```

## Decisões

- **Índice recriado a cada execução:** apagar e regravar vetores no mesmo índice faz a busca aproximada do LibSQL deixar de encontrar alguns deles. Como a ingestão é completa, o índice é apagado e recriado no início.
- **Base vetorial trocável:** a ingestão depende só do contrato `KnowledgeStore` (`rag/knowledge-store.ts`), implementado com LibSQL em `rag/libsql-store.ts`. Trocar o LibSQL (por exemplo, por PgVector) exige apenas uma nova implementação desse contrato.
- **Prefixos do `nomic-embed-text`:** o modelo foi treinado com prefixos de tarefa (`search_document:` nos textos, `search_query:` nas perguntas) e a busca piora sem eles. O `createEmbedder` aplica o prefixo de documento na ingestão; a busca deve usar `createEmbedder(config, "query")` para manter os dois lados compatíveis. Em perguntas de teste, os acertos no top 3 subiram de 2 para 3 de 4 com os prefixos. Se o modelo for trocado, a base precisa ser regerada.
- **Sem OCR:** PDFs digitalizados são reportados como falha de extração; OCR pode ser avaliado depois.

## Testes

```bash
pnpm --filter mastra-core test
```
