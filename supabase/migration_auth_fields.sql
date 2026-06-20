-- Migration: add auth & status fields (run if you already applied an earlier schema)

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
  status ticket_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_status_history_ticket_id ON ticket_status_history (ticket_id);

-- Backfill password_hash for existing rows (replace with actual bcrypt hash via app)
-- UPDATE users SET password_hash = '...' WHERE password_hash IS NULL;
-- ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
