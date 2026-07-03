CREATE TABLE IF NOT EXISTS organizer_magic_links (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS organizer_magic_links_email_created_idx
  ON organizer_magic_links(email, created_at DESC);

CREATE INDEX IF NOT EXISTS organizer_magic_links_expiry_idx
  ON organizer_magic_links(expires_at);
