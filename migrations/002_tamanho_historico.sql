-- Tamanho de cada mensagem, para o limite de histórico por usuário (HISTORY_MAX_MB_PER_USER).
-- O banco calcula sozinho a partir de parts + metadata (texto e anexos em base64),
-- então o valor nunca fica errado, nem nas mensagens que já existiam.
-- Somar esta coluna é barato; recalcular o jsonb de todo o histórico a cada gravação não seria.
ALTER TABLE messages
  ADD COLUMN size_bytes integer NOT NULL
    GENERATED ALWAYS AS (octet_length(parts::text) + coalesce(octet_length(metadata::text), 0)) STORED;
