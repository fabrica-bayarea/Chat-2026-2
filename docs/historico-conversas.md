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
| `size_bytes` | `integer` | tamanho de `parts` + `metadata`, calculado pelo próprio banco (coluna gerada). Usado no limite de espaço por usuário |
| `created_at`, `updated_at` | `timestamptz` | criação e última alteração |

Índice `(conversation_id, position)`: a conversa inteira em ordem.

## Migrations

O SQL da modelagem fica na pasta **`migrations/` da raiz do repositório** (`migrations/NNN_nome.sql`): `001_historico_conversas.sql` (tabelas) e `002_tamanho_historico.sql` (coluna `size_bytes`). As migrations são aplicadas em ordem, uma vez cada, numa transação (tabela `schema_migrations`).

**O backend aplica as migrations sozinho ao subir.** Quem roda o projeto já tem as tabelas criadas, sem passo extra:

```bash
docker compose up -d postgres          # PostgreSQL de desenvolvimento na porta 5433
cp apps/backend/.env.example apps/backend/.env
pnpm --filter backend dev              # cria/atualiza as tabelas e sobe a API na porta 3001
```

Para aplicar sem subir a API (ex.: num deploy):

```bash
pnpm --filter backend db:migrate
```

Nova mudança no banco = novo arquivo na pasta, com o próximo número (ex.: `002_adiciona_coluna.sql`). Nunca editar uma migration que já foi aplicada.

## API (`apps/backend`, prefixo `/api/conversations`)

Base em desenvolvimento: `http://localhost:3001/api/conversations`.

- **Quem é o usuário**: o cookie `chat_usuario` (httponly). O front manda com `credentials: 'include'`. Cada rota só enxerga as conversas desse usuário.
- **Datas**: em milissegundos desde 1970 (`Date.now()`), como o front já usava.
- **Mensagens**: no formato `UIMessage` do AI SDK (`id`, `role`, `parts`, `metadata`). As `parts` e o `metadata` voltam com o mesmo conteúdo que foi gravado; só a ordem das chaves dentro de cada objeto pode mudar (o PostgreSQL guarda em `jsonb`).

| Método e rota | O que faz | Sucesso |
|---|---|---|
| `GET /` | Lista as conversas do usuário | `200` + lista |
| `POST /` | Cria uma conversa vazia | `201` + resumo |
| `GET /:id` | Abre uma conversa com as mensagens em ordem | `200` + conversa |
| `PUT /:id/messages` | Grava a conversa inteira | `204` sem corpo |
| `PATCH /:id` | Renomeia | `204` sem corpo |
| `DELETE /:id` | Apaga a conversa e as mensagens | `204` sem corpo |
| `PUT /:id/messages/:messageId/feedback` | Grava o feedback de uma mensagem | `204` sem corpo |

### `GET /api/conversations`: conversas do usuário

Da mais recente para a mais antiga (pela última mensagem gravada). Sem cookie, ou usuário sem conversas: `[]`.

```json
[
  {
    "id": "Xk2mP9qLr4TzW8vB",
    "title": "Quais cursos de tecnologia vocês têm?",
    "createdAt": 1795614000000,
    "updatedAt": 1795614120000
  },
  {
    "id": "3f1c2a9e-5b7d-4e2a-9c1f-0a8b6d4e2f10",
    "title": "Nova conversa",
    "createdAt": 1795610000000,
    "updatedAt": 1795610000000
  }
]
```

### `POST /api/conversations`: criar conversa

Corpo: `{}` (o backend gera o id) ou `{ "id": "Xk2mP9qLr4TzW8vB" }`. Se o navegador ainda não tem usuário, a resposta traz o cookie `chat_usuario`.

`201`:

```json
{
  "id": "3f1c2a9e-5b7d-4e2a-9c1f-0a8b6d4e2f10",
  "title": "Nova conversa",
  "createdAt": 1795610000000,
  "updatedAt": 1795610000000
}
```

Id que já existe: `409`.

### `GET /api/conversations/:id`: conversa com as mensagens

Mensagens em ordem (como foram gravadas). `feedback` traz só as mensagens que têm feedback, pelo id da mensagem. `metadata` só aparece quando a mensagem tem.

`200`:

```json
{
  "id": "Xk2mP9qLr4TzW8vB",
  "title": "Quais cursos de tecnologia vocês têm?",
  "createdAt": 1795614000000,
  "updatedAt": 1795614120000,
  "messages": [
    {
      "id": "b1f6c0d2-8a4e-4c1b-9f3a-2d7e5c8b1a90",
      "role": "user",
      "parts": [{ "type": "text", "text": "Quais cursos de tecnologia vocês têm?" }],
      "metadata": { "createdAt": 1795614000000 }
    },
    {
      "id": "msg-9Qw3Er5Ty7Ui",
      "role": "assistant",
      "parts": [
        { "type": "step-start" },
        { "type": "text", "text": "Temos Ciência da Computação, Engenharia de Software..." }
      ]
    }
  ],
  "feedback": {
    "msg-9Qw3Er5Ty7Ui": "up"
  }
}
```

### `PUT /api/conversations/:id/messages`: gravar a conversa

O front chama depois de cada resposta, com **todas** as mensagens na ordem. O backend:

- cria a conversa se ela ainda não existe (título = primeira mensagem do usuário, até 60 caracteres);
- insere as mensagens novas e atualiza as que já existiam (o feedback é mantido);
- apaga as que não vieram mais (ex.: resposta trocada ao regenerar).

Corpo:

```json
{
  "messages": [
    { "id": "b1f6c0d2-...", "role": "user", "parts": [{ "type": "text", "text": "Oi" }], "metadata": { "createdAt": 1795614000000 } },
    { "id": "msg-9Qw3Er5Ty7Ui", "role": "assistant", "parts": [{ "type": "text", "text": "Olá!" }] }
  ]
}
```

`204`, sem corpo. Se o navegador ainda não tem usuário, a resposta traz o cookie `chat_usuario`.

Limites: até 500 mensagens, 100 partes por mensagem, `role` = `user` | `assistant` | `system`, ids sem repetição, corpo de até 30 MB, e o espaço do usuário (abaixo).

#### Espaço por usuário

Cada usuário tem até **100 MB** de histórico (`HISTORY_MAX_MB_PER_USER` no `apps/backend/.env`), somando todas as mensagens e anexos das conversas dele (`size_bytes`).

- A conta é feita **depois** da gravação, dentro da transação: regravar a mesma conversa conta o tamanho novo, não soma o antigo de novo.
- Passou do limite: `507` e **nada** da gravação fica (nem a conversa nova). O front mostra "O espaço do seu histórico acabou. Exclua conversas antigas para continuar salvando."
- Excluir conversas libera o espaço na hora.
- Duas gravações do mesmo usuário ao mesmo tempo (ex.: duas abas) esperam uma pela outra (`FOR UPDATE` no usuário), então não passam juntas pelo limite.

`507`:

```json
{
  "message": "Seu histórico atingiu o limite de 100 MB. Exclua conversas antigas para continuar salvando.",
  "statusCode": 507
}
```

### `PATCH /api/conversations/:id`: renomear

Corpo: `{ "title": "Dúvidas sobre o vestibular" }` (1 a 200 caracteres, espaços nas pontas são removidos). `204`, sem corpo.

### `DELETE /api/conversations/:id`: apagar

`204`, sem corpo. As mensagens são apagadas junto.

### `PUT /api/conversations/:id/messages/:messageId/feedback`: feedback

Corpo: `{ "value": "up" }`, `{ "value": "down" }` ou `{ "value": null }` (tira o feedback). `204`, sem corpo.

### Erros

Formato padrão do NestJS:

```json
{
  "message": "Conversa não encontrada.",
  "error": "Not Found",
  "statusCode": 404
}
```

| Status | Quando |
|---|---|
| `400` | Id inválido, corpo fora do formato (ex.: `role` desconhecido, `parts` faltando), título vazio, feedback fora de `up`/`down`/`null` |
| `404` | Conversa (ou mensagem) não existe **ou é de outra pessoa**. As duas respostas são iguais para não revelar que o id existe |
| `409` | `POST` com um id que já existe |
| `413` | Corpo acima de 30 MB |
| `507` | O histórico do usuário passaria de 100 MB (`HISTORY_MAX_MB_PER_USER`) |

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
- **Continuidade de contexto**: a conversa completa e ordenada pode ser lida pelo backend para montar o contexto do agente. O que vai para o modelo a cada resposta (janela de contexto) está em [`limites-do-agente.md`](limites-do-agente.md).

## Testes

```bash
docker compose up -d postgres
pnpm --filter backend test:e2e
pnpm --filter web test
```

`apps/backend/test/conversations.e2e-spec.ts` roda contra um PostgreSQL de verdade (banco `chat_historico_test`, recriado a cada execução).
