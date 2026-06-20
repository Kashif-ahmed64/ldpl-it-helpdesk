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
  password_hash TEXT NOT NULL,
  password_changed BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_employee_id ON users (employee_id);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_is_active ON users (is_active);

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
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments (ticket_id);
CREATE INDEX idx_ticket_comments_user_id ON ticket_comments (user_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments (created_at);

-- ---------------------------------------------------------------------------
-- Ticket status history (timeline)
-- ---------------------------------------------------------------------------

CREATE TABLE ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
  status ticket_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_status_history_ticket_id ON ticket_status_history (ticket_id);

-- Auto-record initial status on ticket creation
CREATE OR REPLACE FUNCTION record_initial_ticket_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ticket_status_history (ticket_id, status)
  VALUES (NEW.id, NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_status_on_create
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION record_initial_ticket_status();

-- ---------------------------------------------------------------------------
-- Row Level Security (permissive — app handles auth via users table)
-- ---------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tickets access" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all comments access" ON ticket_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all status history access" ON ticket_status_history FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Supabase Storage — ticket attachments
-- ---------------------------------------------------------------------------
-- Create bucket: ticket-attachments (private recommended)
-- Allow anon/authenticated upload and read policies as needed for your setup.
