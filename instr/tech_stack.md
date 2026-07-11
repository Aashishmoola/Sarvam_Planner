# Tech Stack — Broad Overview

## Shape

A single Next.js app talking to one managed backend (Supabase). No separate API server, no separate auth service, no separate DB. Push notifications are dispatched from Supabase Edge Functions to Chrome browsers via the standard Web Push protocol.

```
┌──────────────────────────────────────┐         ┌──────────────────────────────┐
│  Browser (Chrome, Win/Android)       │         │  Supabase                    │
│                                      │         │                              │
│  Next.js 14 (App Router, TS, RSC)    │◀──HTTPS─▶│  Postgres + RLS (data)      │
│  Tailwind (black + blue palette)     │         │  Auth (magic link)           │
│  Zustand + TanStack Query (state)    │         │  Edge Functions (cron jobs)  │
│  Service Worker (push handler)       │◀──push──│  web-push (VAPID)            │
└──────────────────────────────────────┘         └──────────────────────────────┘
                    ▲
                    │  git push
                    │
              ┌─────┴──────┐
              │   Vercel   │  (hosting)
              └────────────┘
```

## Frontend

| Piece | Choice | Why |
|---|---|---|
| Framework | **Next.js 14** (App Router) | Routing, server components, API routes, and service-worker story in one package. No separate SPA + backend to wire up. |
| Language | **TypeScript** | Catches shape errors on a data-model-heavy app; Supabase types can be generated. |
| Styling | **Tailwind CSS** | Utility-first fits a small design system (~6 blue shades + 3 grays). No CSS-in-JS runtime cost. |
| UI state | **Zustand** | Small, un-opinionated store for local UI state (open modals, selected day). Skips Redux boilerplate. |
| Server state | **TanStack Query** | Cache + optimistic updates so tap-to-check feels instant on mobile. |
| Validation | **Zod** | One schema shared between forms and server actions; catches bad payloads at the boundary. |
| Dates | **date-fns** + **date-fns-tz** | Small, tree-shakeable; timezone-aware math for user's noon and morning-push windows. |

## Backend

| Piece | Choice | Why |
|---|---|---|
| Data | **Postgres** (via Supabase) | Relational shape fits goal ↔ cycle ↔ day ↔ check-off cleanly. Row-level security removes the need for an auth middleware. |
| Auth | **Supabase Auth** (magic link only) | No passwords, no reset flow — matches the minimalist ethos. Cookies handled by `@supabase/ssr`. |
| Access control | **Row Level Security** | Every table has `user_id = auth.uid()` policies. Users can only ever read/write their own rows. |
| Scheduled jobs | **Supabase Edge Functions** on cron | Two required jobs: noon auto-fail sweep, morning push notification. Runs hourly, computes per-user local time. |
| Push delivery | **web-push** (npm) | Standard VAPID Web Push. Works identically on Chrome Windows + Chrome Android. |

## Push notifications

- **Standard:** Web Push API (VAPID), not FCM. Vendor-neutral, no Google Console dependency, iOS/MacOS out of scope so no compatibility gap.
- **Service worker:** [public/sw-custom.js](public/sw-custom.js) (added in Phase D). Handles `push` event and shows notifications when the tab is closed.
- **Storage:** Each push subscription (endpoint + keys) is stored in `push_subscriptions` scoped to the user id. Stale endpoints (410 Gone) are deleted by the sending Edge Function.

## Hosting

- **Vercel** — frontend. Git push → deploy. HTTPS + preview URLs + edge middleware. Free tier.
- **Supabase** — data + auth + functions + cron. Free tier.

Two services, two dashboards, no infrastructure to manage.

## Conventions

- App Router route groups: `(auth)` for unauthenticated pages, `(app)` for signed-in pages, `(onboarding)` for the forced onboarding flow. Groups don't affect URLs.
- `lib/supabase/*` for DB clients (browser / server / middleware variants).
- `lib/engine/*` for pure functions (promotion / demotion / failure detection) — testable without Supabase.
- Server actions for mutations; TanStack Query for reads. Optimistic on check/cross.
- Migrations live in `supabase/migrations/` as numbered SQL files applied via Supabase SQL Editor (MVP) or Supabase CLI (later).

## What is *not* in this stack (intentional)

- No Express/Node backend — Supabase covers it.
- No Firebase / FCM — VAPID Web Push covers Chrome without vendor lock-in.
- No Redux — Zustand is sufficient.
- No dnd-kit in MVP — tap-to-place is faster to ship.
- No i18n framework — single-locale MVP.
- No offline sync — online-required for now; service worker only handles push.
