# Sarvam Planner

Minimalist goal-setting & completion-tracking browser app for highly neurotic, less-conscientious users. One nudge a day. Show up.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions)
- **Push:** Web Push API (VAPID) + Service Worker — Chrome on Windows/Android only
- **State:** Zustand (UI) + TanStack Query (server)
- **Validation:** Zod

## Prerequisites

- Node.js 20+ (repo uses `nvm` LTS)
- A Supabase project (free tier is fine)

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com), then apply the migration
   ```bash
   # Supabase Dashboard → SQL Editor → paste contents of:
   supabase/migrations/0001_initial_schema.sql
   ```

3. Copy env template and fill in your project's URL and anon key
   ```bash
   cp .env.local.example .env.local
   # edit .env.local
   ```

4. Configure Supabase Auth redirect URL: add `http://localhost:3000/auth/callback` under
   Authentication → URL Configuration → Redirect URLs.

5. Run the dev server
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## Build phases

- **Phase A** (current) — Scaffold, auth, DB schema.
- **Phase B** — Onboarding + goal/motto/focus-hour CRUD.
- **Phase C** — Daily calendar (tap-to-place), check-off, journaling.
- **Phase D** — Push notifications + morning check-in + noon auto-fail cron.
- **Phase E** — Adjustment engine (promotion/demotion, cycle rollover).
- **Phase F** — Polish, a11y, device tests.

Full plan: `~/.claude/plans/build-the-app-as-swirling-phoenix.md`.
Specs: [instr/instanciation.md](instr/instanciation.md), [instr/UI_Workflows_Sarvam_Planner.md](instr/UI_Workflows_Sarvam_Planner.md).
