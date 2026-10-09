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

### Testando o agente
```bash
pnpm --filter mastra-core chat:test
```
O script roda uma bateria de mensagens de teste — conversação simples, perguntas fora do domínio da faculdade, tentativas de jailbreak e verificação de contexto entre mensagens de uma mesma sessão — e imprime as respostas do agente no terminal.

### Rodando
Por enquanto o `mastra-core` não expõe uma API própria; ele funciona como camada de orquestração do agente, consumida pelo `apps/backend`. Para desenvolvimento e testes isolados do agente, use o script `chat:test` acima.

## 📂 Estrutura do Workspace (Turborepo)

O monorepo está dividido nos seguintes pacotes e aplicações. Cada uma possui sua própria documentação detalhada:

- **[`docs/`](docs/README.md):** Documentação do projeto, incluindo visão do produto (`docs/visao.md`), requisitos e épicos (`docs/epicos/`).
- **[`apps/web`](apps/web/README.md):** Interface de chat para o aluno desenvolvida com React e Vite.
- **[`apps/backend`](apps/backend/README.md):** API de retaguarda institucional construída em NestJS.
- **[`apps/mastra-core`](apps/mastra-core/README.md):** Cérebro de orquestração de IA, agentes, políticas de RAG e integração com MCPs.
- **[`apps/mcp-server`](apps/mcp-server/README.md):** Servidor customizado de Model Context Protocol.