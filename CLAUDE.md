## Preferences
- IF project structure is changed (multiple files added) OR > 20 lines of code changed across src files
    - Commit to git with appropriate commit message, explaining changes made in shortform manner.
    - Push to remote repository

- Add basic tech stack and conventions used in this file for tracking. Be as consise as possible

- Refer to these specific .md files for additional context to carry out specific tasks
    - ./instr/instanciation.md --> First protoptype of app (minimum viable product)
    - ./instr/UI_Workflows_Sarvam_Planner.md --> Detailed workflow spec for the MVP
    - ./instr/tech_stack.md --> Broad-level tech stack overview

## Tech stack (MVP)
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind (black+blue palette)
- State: Zustand (UI) + TanStack Query (server); Zod for validation
- Backend: Supabase — Postgres + Auth (magic-link) + RLS + Edge Functions
- Push: Web Push API + VAPID + Service Worker (Chrome Windows/Android only)
- Hosting: Vercel (frontend) + Supabase (data/functions/cron)
- Directory conventions: `app/(auth|app|onboarding)` route groups; `lib/supabase/*` clients; `lib/engine/*` pure logic; `supabase/migrations/` numbered SQL