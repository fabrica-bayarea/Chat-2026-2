# Histórico de conversas (persistência no backend)

O histórico do chat fica no **PostgreSQL**, no `apps/backend`. O front não guarda mais as conversas no `localStorage`: ele usa a API abaixo pelo `HttpConversationService` (`apps/web/src/services/`), que implementa a mesma interface `ConversationService` de antes.

## Modelo

```text
users 1 ──── N conversations 1 ──── N messages
```

### `users`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | opcional (identificação do EP-01, US-02) |
| `email` | `text` | opcional |
| `created_at`, `updated_at` | `timestamptz` | `now()` |

Ainda não há login no projeto. Cada navegador recebe um usuário anônimo, criado na primeira gravação, e o id dele vai num cookie `chat_usuario` **httponly** (o JavaScript da página não lê). Quando existir login, o id do usuário passa a vir da sessão, e `name`/`email` já têm lugar.

### `conversations`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `text` | PK. Vem do front (`generateId` do AI SDK) ou do backend (UUID). Só `A-Z a-z 0-9 _ -`, até 100 caracteres |
| `user_id` | `uuid` | FK → `users.id`, `ON DELETE CASCADE`, obrigatório |
| `title` | `text` | 1 a 200 caracteres. Derivado da primeira mensagem do usuário |
| `created_at` | `timestamptz` | criação |
| `updated_at` | `timestamptz` | última gravação de mensagens (ordem da lista) |

Índice `(user_id, updated_at DESC)`: conversas de um usuário, da mais recente para a mais antiga.

### `messages`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `bigint` | PK (identity) |
| `conversation_id` | `text` | FK → `conversations.id`, `ON DELETE CASCADE` |
| `message_id` | `text` | id da mensagem no front; `UNIQUE (conversation_id, message_id)` |
| `role` | `text` | `user`, `assistant` ou `system` (CHECK) |
| `parts` | `jsonb` | partes da mensagem no formato do AI SDK (texto, anexo...); precisa ser lista |
| `metadata` | `jsonb` | opcional (ex.: `createdAt` do front) |
| `feedback` | `text` | `up`, `down` ou nulo (CHECK) |
| `position` | `integer` | ordem na conversa (≥ 0) |
| `created_at`, `updated_at` | `timestamptz` | criação e última alteração |

Índice `(conversation_id, position)`: a conversa inteira em ordem.

## Migrations

SQL puro em `apps/backend/migrations/NNN_nome.sql`, aplicadas em ordem, uma vez cada, numa transação (tabela `schema_migrations`).

```bash
docker compose up -d postgres          # PostgreSQL de desenvolvimento na porta 5433
cp apps/backend/.env.example apps/backend/.env
pnpm --filter backend db:migrate
```

## API (`apps/backend`, prefixo `/api/conversations`)

Toda rota só enxerga as conversas do usuário do cookie. Conversa de outra pessoa responde **404**, igual a uma conversa que não existe.

| Método e rota | O que faz |
|---|---|
| `GET /` | Conversas do usuário (`id`, `title`, `createdAt`, `updatedAt`), da mais recente para a mais antiga. Sem cookie: lista vazia |
| `POST /` | Cria uma conversa nova (`201`). Cria o usuário e o cookie se ainda não existem |
| `GET /:id` | Conversa com as mensagens em ordem e o feedback de cada uma |
| `PUT /:id/messages` | `{ messages }`: grava a conversa inteira na ordem recebida. Cria a conversa se ela não existe, atualiza as mensagens que já existiam (o feedback é mantido) e apaga as que não vieram mais (ex.: resposta trocada ao regenerar) |
| `PATCH /:id` | `{ title }`: renomeia |
| `DELETE /:id` | Apaga a conversa e as mensagens |
| `PUT /:id/messages/:messageId/feedback` | `{ value: "up" \| "down" \| null }` |

Datas saem em milissegundos, como o front já usava.

## Segurança

- O id do usuário só circula no cookie httponly (SameSite=Lax; Secure em produção) e nunca aparece no corpo das respostas.
- Todas as consultas filtram pelo dono da conversa.
- Entradas validadas no backend (id, role, partes, título, feedback) e pelo próprio banco (CHECK e FK).
- O conteúdo das conversas não é escrito em log.

## Preparado para depois

- **Listagem, renomear, excluir e feedback**: já existem na API e no banco.
- **Paginação**: os índices por usuário/data e por conversa/posição permitem paginar sem mudar o modelo.
- **Metadados**: colunas `metadata` (mensagem) em `jsonb`; novas colunas entram por migration.
- **Login**: `users` já tem `name`/`email`. O dono passa a vir da sessão em vez do cookie anônimo.
- **Continuidade de contexto**: a conversa completa e ordenada pode ser lida pelo backend para montar o contexto do agente.

## Testes

```bash
docker compose up -d postgres
pnpm --filter backend test:e2e
pnpm --filter web test
```

`apps/backend/test/conversations.e2e-spec.ts` roda contra um PostgreSQL de verdade (banco `chat_historico_test`, recriado a cada execução).
