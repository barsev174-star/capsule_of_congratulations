CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY,
  category text NOT NULL,
  contact_name text,
  email text NOT NULL,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT support_requests_category_check CHECK (category IN ('problem', 'suggestion', 'question')),
  CONSTRAINT support_requests_status_check CHECK (status IN ('new', 'in_progress', 'resolved'))
);

CREATE INDEX IF NOT EXISTS support_requests_status_created_idx
  ON support_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS support_requests_email_created_idx
  ON support_requests(email, created_at DESC);
