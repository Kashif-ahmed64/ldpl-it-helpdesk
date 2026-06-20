# LDPL IT Helpdesk — Project Documentation

Internal IT support ticketing portal for **Liberty Daharki Powers Ltd**.

## Tech Stack

- React 19 + TypeScript + Vite
- Supabase (PostgreSQL, Storage, Realtime)
- React Router, React Hook Form, Zod, Recharts, Lucide React, XLSX, bcryptjs

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** — create a `.env` file in the project root:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run the database schema** — execute `supabase/schema.sql` in the Supabase SQL Editor.

4. **Create Storage bucket** — in Supabase Dashboard → Storage, create bucket `ticket-attachments`.

5. **Enable Realtime** — in Supabase Dashboard → Database → Replication, enable Realtime for `tickets` table.

6. **Start dev server**
   ```bash
   npm run dev
   ```

7. **Create first admin user** — insert into `users` table with bcrypt-hashed password (default temp password = Employee ID).

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Employee accounts (auth, roles, departments) |
| `tickets` | IT support tickets |
| `ticket_comments` | Internal notes (IT/Admin only) |
| `ticket_status_history` | Status change timeline |

### Key columns

**users:** `employee_id`, `name`, `designation`, `department`, `role`, `password_hash`, `password_changed`, `is_active`

**tickets:** `ticket_number` (IT-2026-XXXX), `title`, `description`, `category`, `priority`, `status`, `raised_by`, `assigned_to`, `attachment_url`, `resolved_at`

**ticket_comments:** `ticket_id`, `user_id`, `comment`, `is_internal`

## Roles

| Role | DB value | Access |
|------|----------|--------|
| System Admin | `admin` | Users, Reports, full ticket management |
| IT Staff | `it_staff` | Ticket dashboard, queue, assignment |
| Employee | `employee` | Raise tickets, view own tickets |

## Routes

| Route | Role | Page |
|-------|------|------|
| `/login` | Public | Login |
| `/change-password` | All (forced on first login) | Password change |
| `/admin` | Admin | Ticket dashboard (KPIs + charts) |
| `/admin/users` | Admin | User management |
| `/admin/tickets` | Admin | All tickets table |
| `/admin/assigned` | Admin | My assigned tickets |
| `/admin/reports` | Admin | Reports + Excel export |
| `/it` | IT Staff | Ticket dashboard |
| `/it/tickets` | IT Staff | All tickets table |
| `/it/assigned` | IT Staff | My assigned tickets |
| `/employee` | Employee | Home + ticket summary |
| `/employee/raise` | Employee | Raise a ticket |
| `/employee/tickets` | Employee | My tickets |

## Authentication

- Login with **Employee ID** + **Password** against the `users` table
- Passwords stored as bcrypt hashes
- New users get temp password = their Employee ID; must change on first login
- Session stored in localStorage

## Realtime Notifications

- **Employees:** notified when their ticket status changes
- **IT Staff / Admin:** notified when new tickets are created (Urgent highlighted)
- Bell icon in top bar with unread badge; toast banner on live updates

## Theme

LDPL brand: dark navy (`#0a1628`), red accents (`#8B0000`, `#C0392B`), white cards, red sidebar across all role areas. Status and priority badges use consistent colors app-wide via `src/utils/badges.ts`.

## Project Structure

```
src/
  pages/admin/       Admin layout, users, reports
  pages/it/          IT layout, dashboard, tickets
  pages/employee/    Employee layout, home, raise, my tickets
  components/        Shared UI (Modal, Badge, Topbar, etc.)
  context/           AuthContext
  hooks/             useTicketNotifications
  utils/             auth, db mappers, badges, tickets, format
  types.ts           TypeScript interfaces
  config/supabase.ts Supabase client
supabase/
  schema.sql         Full database schema
```
