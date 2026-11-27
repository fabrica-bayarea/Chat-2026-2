-- Histórico de conversas: usuário 1:N conversas 1:N mensagens.
-- Modelagem documentada em docs/historico-conversas.md.

-- Usuário dono das conversas. Hoje é o visitante identificado por um cookie httponly.
-- nome e e-mail ficam opcionais para a identificação do EP-01 (US-02) e o login do EP-05.
CREATE TABLE users (
  id          uuid        PRIMARY KEY,
  name        text,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- O id da conversa vem do front (generateId do AI SDK) ou do backend (UUID): por isso text.
CREATE TABLE conversations (
  id          text        PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{1,100}$'),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Conversas de um usuário, da mais recente para a mais antiga (listagem e paginação futura)
CREATE INDEX conversations_user_updated_idx ON conversations (user_id, updated_at DESC);

-- message_id é o id que o front dá à mensagem (único dentro da conversa).
-- position guarda a ordem da conversa; parts e metadata guardam o formato do AI SDK.
CREATE TABLE messages (
  id               bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id  text        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  message_id       text        NOT NULL CHECK (char_length(message_id) BETWEEN 1 AND 100),
  role             text        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  parts            jsonb       NOT NULL CHECK (jsonb_typeof(parts) = 'array'),
  metadata         jsonb,
  feedback         text        CHECK (feedback IN ('up', 'down')),
  position         integer     NOT NULL CHECK (position >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, message_id)
);

-- Mensagens de uma conversa em ordem
CREATE INDEX messages_conversation_position_idx ON messages (conversation_id, position);
