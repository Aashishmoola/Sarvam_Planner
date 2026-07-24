# Phase D — deployment steps

The Phase D code is in the repo, but the Supabase-side pieces (Edge
Functions, schedules, secrets, VAPID) must be configured in your project.
This is a checklist — Claude Code can't deploy to your Supabase project.

## 1. Apply the migration

Supabase Dashboard → SQL Editor → run:

```
supabase/migrations/0003_notifications.sql
```

This adds `user_config.push_enabled` (default true). Grants from
`0002_grants.sql` already cover the new column via default privileges.

## 2. Edge Function secrets

Dashboard → Edge Functions → manage secrets (or `supabase secrets set …`
via the CLI). Set:

| Secret | Value |
|---|---|
| `SUPABASE_SERVICE_KEY` | `sb_secret_…` (Dashboard → Settings → API Keys → secret key) |
| `VAPID_SUBJECT` | `mailto:you@example.com` (same as `.env.local`) |
| `VAPID_PUBLIC_KEY` | the public VAPID key from `.env.local` |
| `VAPID_PRIVATE_KEY` | the private VAPID key from `.env.local` |

`SUPABASE_URL` is auto-provided. If you haven't deactivated the legacy
service_role key, the functions fall back to `SUPABASE_SERVICE_ROLE_KEY`
automatically — but set `SUPABASE_SERVICE_KEY` for the forward path.

## 3. Deploy the two functions

```
supabase functions deploy midnight-autofail
supabase functions deploy daily-checkin-push
```

or paste each `supabase/functions/<name>/index.ts` into the dashboard
Edge Function editor.

## 4. Schedules (hourly)

Dashboard → Edge Functions → select `midnight-autofail` → Add Schedule:
cron `0 * * * *` (top of every hour). Repeat for `daily-checkin-push`.

- `midnight-autofail` fails pending assignments once the user's local
  day rolls past — running hourly keeps the lag under an hour.
- `daily-checkin-push` sends the morning nudge when the user's local
  hour equals `morning_push_at`; hourly cadence catches every timezone.

## 5. VAPID keys (already generated)

`.env.local` has `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`
(generated with `npx web-push generate-vapid-keys`). If you regenerate,
copy the matching private key into the function secret in step 2.

## 6. Browser redirect URL

Already configured for `/auth/callback`. The push click opens `/check-in`,
which is an in-app route — no extra config.

## Testing in dev

- Push + service worker work on `localhost` (Chrome treats it as secure).
- Visit Settings → Notifications → "Enable on this browser" → pre-prompt
  → browser permission prompt → subscription stored in `push_subscriptions`.
- To exercise the cron logic without waiting, invoke the function manually:
  `supabase functions invoke midnight-autofail` (or the dashboard "Invoke"
  button). Inspect rows in Table Editor → `day_goal_assignments` (status
  `auto_failed`) and `effort_events` (event_type `auto_failed`).

## Known follow-ups (not in this slice)

- Push idempotency: the hourly cron may double-send within a user's
  morning hour in rare minute-alignment cases. A `morning_push_sent_at`
  column or a push log table would make it strictly once-per-day.
- The `noon_cutoff` column is now vestigial (auto-fail is midnight-local).
  It's unused by the cron; left in place to avoid a migration.
