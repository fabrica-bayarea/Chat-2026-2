![alt text](image.png)

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


## 📂 Estrutura do Workspace (Turborepo)

O monorepo está dividido nos seguintes pacotes e aplicações. Cada uma possui sua própria documentação detalhada:

- **[`docs/`](docs/README.md):** Documentação do projeto, incluindo visão do produto (`docs/visao.md`), requisitos e épicos (`docs/epicos/`).
- **[`apps/web`](apps/web/README.md):** Interface de chat para o aluno desenvolvida com React e Vite.
- **[`apps/backend`](apps/backend/README.md):** API de retaguarda institucional construída em NestJS.
- **[`apps/mastra-core`](apps/mastra-core/README.md):** Cérebro de orquestração de IA, agentes, políticas de RAG e integração com MCPs.
- **[`apps/mcp-server`](apps/mcp-server/README.md):** Servidor customizado de Model Context Protocol.