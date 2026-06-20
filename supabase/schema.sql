-- LDPL IT Helpdesk — Supabase schema
-- Run this in the Supabase SQL Editor or via migrations.

-- ---------------------------------------------------------------------------
-- Enums (match src/types.ts exactly)
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('admin', 'it_staff', 'employee');

CREATE TYPE ticket_category AS ENUM (
  'Hardware',
  'Software',
  'Network',
  'Account',
  'Email',
  'CCTV',
  'Other'
);

CREATE TYPE ticket_priority AS ENUM ('Urgent', 'High', 'Medium', 'Low');

CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Resolved', 'Closed');

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  department TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  password_changed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_employee_id ON users (employee_id);
CREATE INDEX idx_users_role ON users (role);

-- ---------------------------------------------------------------------------
-- Tickets
-- ---------------------------------------------------------------------------

CREATE SEQUENCE ticket_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category ticket_category NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'Medium',
  status ticket_status NOT NULL DEFAULT 'Open',
  raised_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users (id) ON DELETE SET NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_ticket_number ON tickets (ticket_number);
CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_raised_by ON tickets (raised_by);
CREATE INDEX idx_tickets_assigned_to ON tickets (assigned_to);
CREATE INDEX idx_tickets_created_at ON tickets (created_at DESC);

-- Auto-generate ticket numbers as IT-2026-XXXX
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'IT-2026-' || LPAD(nextval('ticket_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- ---------------------------------------------------------------------------
-- Ticket comments
-- ---------------------------------------------------------------------------

CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments (ticket_id);
CREATE INDEX idx_ticket_comments_user_id ON ticket_comments (user_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments (created_at);

-- ---------------------------------------------------------------------------
-- Supabase Storage — ticket attachments
-- ---------------------------------------------------------------------------
-- Create a public or private bucket for ticket file uploads:
--
--   1. In Supabase Dashboard → Storage → New bucket
--   2. Bucket name: ticket-attachments
--   3. Set public = false (recommended; serve via signed URLs)
--
-- Example RLS policies (adjust roles as needed):
--
--   CREATE POLICY "Authenticated users can upload attachments"
--     ON storage.objects FOR INSERT
--     TO authenticated
--     WITH CHECK (bucket_id = 'ticket-attachments');
--
--   CREATE POLICY "Users can read attachments on their tickets"
--     ON storage.objects FOR SELECT
--     TO authenticated
--     USING (bucket_id = 'ticket-attachments');
--
-- Store the resulting public or signed URL in tickets.attachment_url.
