CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS card_recovery_tokens (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS card_recovery_tokens_card_active_idx
  ON card_recovery_tokens(card_id, created_at DESC)
  WHERE revoked_at IS NULL;

INSERT INTO card_recovery_tokens (id, card_id, token_hash, created_at)
SELECT gen_random_uuid(), id, encode(digest(manage_token, 'sha256'), 'hex'), created_at
FROM cards
WHERE manage_token IS NOT NULL AND BTRIM(manage_token) <> ''
ON CONFLICT (token_hash) DO NOTHING;

UPDATE cards SET manage_token = NULL
WHERE manage_token IS NOT NULL;
