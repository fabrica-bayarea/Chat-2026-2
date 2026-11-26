# Chatbot IESB - Monorepo

Sistema de atendimento inteligente para o IESB, estruturado com arquitetura híbrida de IA (LLM On-Premise + Nuvem), controle de ações via RAG e integração segura com sistemas acadêmicos externos via **MCP (Model Context Protocol)**.

## 🏗️ Arquitetura do Monorepo

O projeto utiliza **Turborepo** e **pnpm workspaces**:

- `docs/`: Documentação do projeto, incluindo visão do produto (`visao.md`), requisitos e épicos (`epicos/`).
- `apps/`
- `apps/web`: Interface de chat para o aluno (React + Vite).
- `apps/backend`: API principal e retaguarda institucional (NestJS).
- `apps/mastra-core`: Cérebro de orquestração de agentes, RAG e conexões MCP (**Mastra**).

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (versão 18+)
- pnpm instalado globalmente
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o banco PostgreSQL do histórico de conversas)

### 1. Instalação das Dependências
Na raiz do projeto, execute:
```bash
pnpm install
```

### 2. Configuração do Ambiente
Copie o arquivo de exemplo de variáveis de ambiente e preencha com suas chaves e URLs:
```bash
cp .env.example .env
```

### 3. Rodando em Desenvolvimento
Para iniciar todos os aplicativos do monorepo simultaneamente:
```bash
pnpm dev
```

## 🐳 Banco de dados com Docker (PostgreSQL)

O histórico de conversas fica num PostgreSQL. Para desenvolvimento, ele roda no Docker pelo `docker-compose.yml` da raiz (serviço `postgres`). Detalhes da modelagem e da API em [`docs/historico-conversas.md`](docs/historico-conversas.md).

### 1. Abrir o Docker
Abra o **Docker Desktop** e espere ele terminar de iniciar. Para conferir:
```bash
docker ps
```
Se aparecer `failed to connect to the docker API`, o Docker ainda não está ligado.

### 2. Montar e subir o banco
Na raiz do projeto:
```bash
docker compose up -d postgres
```
Na primeira vez, o Docker baixa a imagem `postgres:17.6-alpine` e cria o banco `chat_historico`. O `-d` deixa o banco rodando em segundo plano. O aviso `the attribute 'version' is obsolete` pode ser ignorado.

| Item | Valor (só desenvolvimento) |
|---|---|
| Container | `iesb-chat-postgres` |
| Porta no seu computador | `5433` (não briga com um PostgreSQL instalado na 5432) |
| Banco | `chat_historico` |
| Usuário / senha | `chat` / `chat_dev` |
| Dados | volume `postgres-data` (continuam lá depois de parar o container) |

Para conferir se o banco está pronto:
```bash
docker compose ps
docker exec iesb-chat-postgres pg_isready -U chat -d chat_historico
```

### 3. Ligar o backend no banco
```bash
cp apps/backend/.env.example apps/backend/.env
```
O `.env.example` já aponta para o banco do Docker (`DATABASE_URL=postgres://chat:chat_dev@localhost:5433/chat_historico`). Ao subir, o backend **cria as tabelas sozinho** (migrations da pasta [`migrations/`](migrations/)):
```bash
pnpm --filter backend dev
```
No log aparece `[db] migrations aplicadas: ...` na primeira vez.

### Comandos do dia a dia
| Para… | Comando |
|---|---|
| Parar o banco (mantém os dados) | `docker compose stop postgres` |
| Subir de novo | `docker compose up -d postgres` |
| Ver o log do banco | `docker compose logs -f postgres` |
| Abrir o terminal SQL | `docker exec -it iesb-chat-postgres psql -U chat -d chat_historico` |
| Apagar o banco e **todos os dados** | `docker compose down -v` |

### Testes do backend
Os testes de integração do backend usam esse mesmo PostgreSQL (num banco separado, `chat_historico_test`, criado sozinho):
```bash
docker compose up -d postgres
pnpm --filter backend test:e2e
```

### ⚠️ O que ainda não sobe pelo Docker
Por enquanto, só o serviço `postgres` do `docker-compose.yml` funciona. **Não use `docker compose up` sem o nome do serviço**: os outros serviços (`web`, `backend`, `mastra-core`, `mcp-server`) ainda não estão prontos.
- `mastra-core` e `mcp-server` não têm Dockerfile.
- `backend` e `web` têm Dockerfile, mas ainda não foram ajustados para o projeto atual.

Rode os apps com `pnpm` (como nas seções acima e abaixo) e só o banco pelo Docker.

## Agente de IA (apps/mastra-core)

O Agent Core é a camada base do agente de IA, construída com **Mastra** e, em ambiente de desenvolvimento, servida por um modelo local via **Ollama**. Nesta fase o agente ainda não depende de ferramentas MCP.

### Pré-requisitos
- [Ollama](https://ollama.com/download) instalado e em execução
- Um modelo baixado no Ollama, por exemplo:
```bash
ollama pull llama3.2:3b
```

### Instalação
As dependências do `mastra-core` já são instaladas junto com o `pnpm install` da raiz (workspaces). Para instalar isoladamente:
```bash
pnpm --filter mastra-core install
```

### Configuração
O `mastra-core` usa seu próprio `.env`, separado do `.env` da raiz:
```bash
cp apps/mastra-core/.env.example apps/mastra-core/.env
```
Preencha `LLM_MODEL` com o nome exato do modelo baixado no Ollama (confira com `ollama list`). 

### Rodando a API de chat
O `mastra-core` expõe a API de chat (HTTP + SSE) usada pelo front. Com o Ollama em execução e o `apps/mastra-core/.env` configurado:
```bash
pnpm --filter mastra-core dev
```
O servidor sobe em `http://localhost:3000` (variável `PORT`) e responde em `POST /api/chat`. O contrato completo (requisição, eventos, códigos de erro, cancelamento e timeout) está em [`docs/chat-api.md`](docs/chat-api.md).

Para testar o agente isoladamente, sem HTTP, use o script `chat:test` descrito acima.

Limites de tokens, janela de contexto de cada conversa e espaço do histórico por usuário: [`docs/limites-do-agente.md`](docs/limites-do-agente.md).

### Testando o agente
```bash
pnpm --filter mastra-core chat:test
```
O script roda uma bateria de mensagens de teste — conversação simples, perguntas fora do domínio da faculdade, tentativas de jailbreak e verificação de contexto entre mensagens de uma mesma sessão — e imprime as respostas do agente no terminal.

### Ingestão da base institucional (RAG)
Coleta as páginas públicas do iesb.br e os documentos de `apps/mastra-core/data/documentos/` (PDF, DOC e DOCX), gera os embeddings e grava tudo em uma base vetorial local. Requer um modelo de embeddings no Ollama:
```bash
ollama pull nomic-embed-text
pnpm --filter mastra-core rag:ingest
```
Fontes, metadados, variáveis e tratamento de falhas estão em [`docs/rag-ingestao.md`](docs/rag-ingestao.md).

Para testar a busca na base pelo terminal:
```bash
pnpm --filter mastra-core rag:search "Onde fica o campus de Ceilândia?"
```
O formato do resultado, o filtro de relevância e a identificação das fontes estão em [`docs/rag-recuperacao.md`](docs/rag-recuperacao.md).

### Rodando
Por enquanto o `mastra-core` não expõe uma API própria; ele funciona como camada de orquestração do agente, consumida pelo `apps/backend`. Para desenvolvimento e testes isolados do agente, use o script `chat:test` acima.

## 📂 Estrutura do Workspace (Turborepo)

O monorepo está dividido nos seguintes pacotes e aplicações. Cada uma possui sua própria documentação detalhada:

- **[`docs/`](docs/README.md):** Documentação do projeto, incluindo visão do produto (`docs/visao.md`), requisitos e épicos (`docs/epicos/`).
- **[`apps/web`](apps/web/README.md):** Interface de chat para o aluno desenvolvida com React e Vite.
- **[`apps/backend`](apps/backend/README.md):** API de retaguarda institucional construída em NestJS.
- **[`apps/mastra-core`](apps/mastra-core/README.md):** Cérebro de orquestração de IA, agentes, políticas de RAG e integração com MCPs.
- **[`apps/mcp-server`](apps/mcp-server/README.md):** Servidor customizado de Model Context Protocol.