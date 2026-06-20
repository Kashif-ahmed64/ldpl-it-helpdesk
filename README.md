# LDPL IT Helpdesk

Internal IT support ticketing portal for Liberty Daharki Powers Ltd.

## Stack

- React + TypeScript + Vite
- Supabase (database, auth, storage)
- React Router, React Hook Form, Zod, Recharts, Lucide React, XLSX

## Getting started

```bash
npm install
cp .env.example .env   # add your Supabase credentials
npm run dev
```

## Project structure

```
src/
  pages/admin/     System Admin views
  pages/it/        IT Staff views
  pages/employee/  Employee views
  components/      Shared UI
  context/         React context providers
  utils/           Helpers
  types.ts         Domain types
  config/supabase.ts
supabase/schema.sql
```

## Database

Run `supabase/schema.sql` in your Supabase SQL Editor to create tables, enums, and the ticket number trigger.

## Theme

LDPL brand colors: dark navy (`#0a1628`) header, red accents (`#8B0000`, `#C0392B`), white cards on a light gray background.
