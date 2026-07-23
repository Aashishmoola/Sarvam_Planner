# Phase C — Daily Calendar & Check-Off (Execution Plan)

> This is a self-contained execution plan for a fresh Claude Code instance. It describes exactly what to build, which files to touch, and how to verify. It assumes Phase A and Phase B are already merged on `main`.

---

## 1. Project context (read this first)

**Sarvam Planner** is a minimalist goal-setting and completion-tracking browser app for highly neurotic, less-conscientious users. It intentionally strips features to the bone: one daily check-in, a small number of goals, and an internal engine that adjusts difficulty based on real behavior. Palette is **black + blue only**.

Read these before touching code:
- [instr/instanciation.md](instanciation.md) — product intent (~30 lines)
- [instr/UI_Workflows_Sarvam_Planner.md](UI_Workflows_Sarvam_Planner.md) — full workflow spec
- [instr/tech_stack.md](tech_stack.md) — broad stack overview
- [../CLAUDE.md](../CLAUDE.md) — project preferences (commit + push after >20 lines changed)

**Overall build plan** lives at `~/.claude/plans/build-the-app-as-swirling-phoenix.md`. Phase C is one slice of that.

---

## 2. Current state (what's already done)

**Phase A** — Scaffold + auth + DB schema (commit `588eb8e`).
**Phase B** — Onboarding + settings (commit `defe3b0`).

### Stack in play
- Next.js 14 App Router + TypeScript + Tailwind (black+blue tokens in [tailwind.config.ts](../tailwind.config.ts))
- Supabase (Postgres + Auth magic-link + RLS) — client helpers in [lib/supabase/](../lib/supabase/)
- Zod for validation — schemas in [lib/validation/](../lib/validation/)
- Zustand + TanStack Query are installed but **not yet used** — Phase C is the first place we'll wire TanStack Query for server state + optimistic updates.

### Existing routes
```
app/
├── (auth)/login/           # magic-link login
├── auth/callback/          # OAuth callback route
├── (onboarding)/           # forced 5-step flow, gated by middleware
│   ├── welcome/
│   ├── limits/
│   ├── focus-hours/
│   ├── goals/
│   └── mottos/
└── (app)/
    ├── today/              # PHASE C REBUILDS THIS
    └── settings/           # settings hub + section mirrors
```

### Middleware gate ([middleware.ts](../middleware.ts) → [lib/supabase/middleware.ts](../lib/supabase/middleware.ts))
- Unauth → `/login`
- Auth but `onboarded_at IS NULL` → `/welcome`
- Auth + onboarded on onboarding route → `/today`
- Auth + onboarded on `/login` → `/today`

Phase C does **not** need to change middleware.

### UI primitives already available
- [components/ui/button.tsx](../components/ui/button.tsx) — `<Button variant="primary|ghost|danger">`
- [components/ui/labeled-input.tsx](../components/ui/labeled-input.tsx) — `<LabeledInput label hint error>`
- [components/ui/step-header.tsx](../components/ui/step-header.tsx) — only used by onboarding

Reuse these. Build new primitives only when needed.

### Palette tokens (in [tailwind.config.ts](../tailwind.config.ts))
- `ink-0` (#000000) → `ink-3` (#1c1c25) — backgrounds, darkest to lightest
- `gray-soft` `gray-mid` `gray-fade` — borders and secondary text
- `blue-50` (#e8f0ff) → `blue-600` (#0030b3) — primary, hover, focus
- No other hues. Use opacity/border thickness to signal state, not color.
- Tap targets: `tap-target` utility (44×44 min) is defined in [app/globals.css](../app/globals.css).

---

## 3. What Phase C ships

A working daily plan page with:

1. **24-hour calendar view** for one day, with the user's sleep window collapsed into a single band.
2. **Tap-to-place** short-term goals into 30-minute time slots (no drag-and-drop — that's out of MVP).
3. **Three non-productive-goal slots** per day (enjoyment goals — no promotion/demotion applied).
4. **Off-focus warning** when a short-term goal is placed in a low-focus or unmarked slot.
5. **Check / Cross buttons** on each assignment, with confirmation modals matching the spec:
   - Check: "Are you sure you truthfully completed this goal?" + effort 1–5 required (strict mode).
   - Cross: "Are you sure you were not able to complete this goal?" + optional journal.
6. **Hooray popup** on check-off confirm (~1.5s auto-dismiss).
7. **Journaling fields** (mood, technique tweak, notes) accessible from each assignment card and captured at check/cross.
8. **Top-right completion badge** (real number now, not the 0% stub).
9. **Prev-day navigation**: swipe-left on touch, arrow-left on keyboard, `/day/[date]` route for any historical day. Historical days are **read-only** except for journal fields (spec doesn't cover this — this is our MVP default).

### What Phase C does NOT do
- **No push notifications** — Phase D.
- **No noon auto-fail cron** — Phase D.
- **No adjustment engine (promotion/demotion)** — Phase E.
- **No stats page** — deferred (badge only, per plan).
- **No drag-and-drop** — tap-to-place only.
- **No offline sync** — online-required MVP.

---

## 4. Data model recap (Phase C tables)

Full schema is in [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql). The tables Phase C touches:

- **`user_config`** — `sleep_start`, `sleep_end`, `timezone`, `max_productive_hours`. Read-only in Phase C.
- **`short_term_goals`** — `id, title, cycle_length_days, difficulty_level, status, retired_at`. Read for picker; not written.
- **`goal_cycles`** — read to know current active cycle for a short-term goal. Not written.
- **`focus_periods`** — `start_time, end_time, intensity, days_of_week`. Read for off-focus computation.
- **`day_plans`** — created/read per (user, date). Written on first visit to any day.
- **`day_goal_assignments`** — the core Phase C table. Written when placing / removing / checking / crossing / journaling.
- **`day_non_productive_goals`** — 3 rows per day_plan (position 0/1/2). Written by the non-productive goals section.
- **`effort_events`** — append-only. Written on every check / cross / auto_fail.
- **`mottos`** — not touched in Phase C (Phase D uses these).

All tables have RLS `user_id = auth.uid()`. Every server action in Phase C should filter by `user_id` explicitly in addition to relying on RLS.

---

## 5. Files to create / modify

### New
```
app/(app)/today/page.tsx                                (REPLACE the current stub)
app/(app)/day/[date]/page.tsx                           (new — historical day view)
app/(app)/_calendar/day-view.tsx                        (client component, main calendar UI)
app/(app)/_calendar/actions.ts                          (server actions, shared by today + day/[date])
app/(app)/_calendar/goal-picker.tsx                     (modal for choosing a short-term goal)
app/(app)/_calendar/check-confirm-modal.tsx
app/(app)/_calendar/cross-confirm-modal.tsx
app/(app)/_calendar/hooray-popup.tsx
app/(app)/_calendar/off-focus-warning.tsx
app/(app)/_calendar/journal-editor.tsx
app/(app)/_calendar/non-productive-section.tsx
app/(app)/_calendar/completion-badge.tsx
app/(app)/_calendar/prev-next-nav.tsx
app/providers.tsx                                       (new — wraps QueryClientProvider)

lib/engine/day-calendar.ts                              (pure helpers: slot math, sleep collapse, off-focus check)
lib/validation/assignment.ts                            (zod schemas: check-off, cross-off, journal, non-prod)
```

### Modified
```
app/layout.tsx                                          (wrap in <Providers>)
```

**Route-group note:** the `_calendar` folder is prefixed with underscore so Next.js treats it as a private folder (not a route). This is a Next.js convention — verify it works or use `components/calendar/` if preferred. If you use `components/calendar/`, colocate server actions in `app/(app)/day-actions.ts` or similar to keep server actions out of the components tree.

---

## 6. Detailed implementation

### 6.1 Providers (new file)

Create [app/providers.tsx](../app/providers.tsx) as a client component that owns a single `QueryClient`. Reason: without `QueryClientProvider` in the tree, TanStack Query hooks throw.

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
```

Modify [app/layout.tsx](../app/layout.tsx) to wrap children in `<Providers>`.

### 6.2 Calendar math (`lib/engine/day-calendar.ts`)

Pure functions, no Supabase imports. Testable in isolation.

Exports:
- `buildDayGrid(config: { sleep_start, sleep_end }): DaySlot[]`
  - Returns 48 slots of 30 minutes each, from 00:00 to 24:00.
  - Each slot: `{ startMinutes: number; endMinutes: number; isSleep: boolean }`.
  - Sleep range wraps midnight (e.g. 23:00 → 07:00). Handle both cases:
    - Non-wrapping: `sleep_start < sleep_end` (unusual but possible, e.g. daytime nap window).
    - Wrapping: `sleep_start > sleep_end` (typical).
- `collapseSleepBands(slots: DaySlot[]): (DaySlot | SleepBand)[]`
  - Merges consecutive sleep slots into a single `SleepBand` with `{ startMinutes, endMinutes }`.
- `isSlotInFocusPeriod(slot, periods, dayOfWeek): { period: FocusPeriod | null; intensity: 'high'|'low'|null }`
  - Returns the matching period (or null) and its intensity for warning computation.
  - `warning_off_focus = intensity !== 'high'`.
- `minutesToHHMM(m: number): string`  — `"09:30"`
- `hhmmToMinutes(s: string): number`  — `"09:30"` → `570`

Include a `snapToGrid(startMinutes, endMinutes): { start, end }` that clamps to 30-min boundaries — needed for the picker.

### 6.3 Zod schemas (`lib/validation/assignment.ts`)

```ts
export const assignSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  short_term_goal_id: z.string().uuid(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).refine(v => v.start_time < v.end_time, { path: ["end_time"] });

export const checkOffSchema = z.object({
  assignment_id: z.string().uuid(),
  effort_score: z.number().int().min(1).max(5),   // required — strict mode
  journal_mood: z.string().max(500).optional().nullable(),
  journal_technique_tweak: z.string().max(1000).optional().nullable(),
  journal_notes: z.string().max(2000).optional().nullable(),
});

export const crossOffSchema = z.object({
  assignment_id: z.string().uuid(),
  journal_mood: z.string().max(500).optional().nullable(),
  journal_technique_tweak: z.string().max(1000).optional().nullable(),
  journal_notes: z.string().max(2000).optional().nullable(),
});

export const journalOnlySchema = z.object({
  assignment_id: z.string().uuid(),
  journal_mood: z.string().max(500).optional().nullable(),
  journal_technique_tweak: z.string().max(1000).optional().nullable(),
  journal_notes: z.string().max(2000).optional().nullable(),
});

export const nonProductiveUpsertSchema = z.object({
  day_plan_id: z.string().uuid(),
  position: z.number().int().min(0).max(2),
  title: z.string().min(1).max(120),
});

export const nonProductiveResolveSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["check", "cross"]),
  journal_notes: z.string().max(2000).optional().nullable(),
});
```

### 6.4 Server actions (`app/(app)/_calendar/actions.ts`)

All actions:
- Start with `"use server";`
- Fetch `user_id` via `createSupabaseServerClient().auth.getUser()` and reject if null.
- Validate inputs with Zod.
- Filter every query by `user_id` in addition to relying on RLS.
- End with `revalidatePath("/today")` and `revalidatePath("/day/[date]")` where relevant.

Actions to implement:

```ts
export async function getOrCreateDayPlan(date: string): Promise<DayPlanId>
// Upsert into day_plans by (user_id, date). Return id.
// Also, on first creation of a day plan, seed 3 empty day_non_productive_goals rows
// at positions 0/1/2 with title="" (or skip and let upsert on demand).
// SIMPLER: don't pre-seed. Create rows only when user types in a slot.

export async function assignGoalToSlot(input: AssignSlotInput): Promise<void>
// 1. Validate with assignSlotSchema.
// 2. Ensure day_plan exists (call getOrCreateDayPlan).
// 3. Check that (start_time, end_time) doesn't overlap existing assignments on that day_plan.
//    Return { error: "That slot overlaps another goal" } if it does.
// 4. Compute warning_off_focus using focus_periods for that date's day-of-week.
// 5. Verify short_term_goal belongs to user and is not retired.
// 6. Insert into day_goal_assignments.

export async function unassignGoal(assignment_id: string): Promise<void>
// Only allowed if status = 'pending'. Otherwise return { error: "Can't remove a resolved goal" }.

export async function checkOffGoal(input: CheckOffInput): Promise<void>
// 1. Validate with checkOffSchema.
// 2. Update day_goal_assignments SET status='checked', resolved_at=now(),
//    effort_score, journal_* WHERE id = $1 AND user_id = auth.uid() AND status='pending'.
// 3. Insert into effort_events (event_type='checked', effort_score).

export async function crossOffGoal(input: CrossOffInput): Promise<void>
// Symmetric to checkOffGoal but status='crossed'. effort_score is NULL.
// Insert into effort_events (event_type='crossed').

export async function updateJournal(input: JournalOnlyInput): Promise<void>
// Allowed regardless of status (users can journal after the fact).
// Only writes journal_* fields.

export async function upsertNonProductiveGoal(input: NonProductiveUpsertInput): Promise<void>
// Upsert by (day_plan_id, position). If title === "" then DELETE the row.

export async function resolveNonProductiveGoal(input: NonProductiveResolveInput): Promise<void>
// Set status='checked' or 'crossed'. Also insert effort_event with event_type mapped
// (event_type='checked' | 'crossed', effort_score=null, assignment_id=null).
```

### 6.5 The `/today` page

Server component. Compute today's date in the user's timezone (use [lib/time/today.ts](../lib/time/today.ts) which already exports `todayInTz`).

```tsx
export default async function TodayPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: config } = await supabase
    .from("user_config").select("*").eq("user_id", user!.id).single();

  const date = todayInTz(config.timezone);
  redirect(`/day/${date}`);   // Or render <DayView> directly with today's date.
}
```

**Preferred:** redirect to `/day/[today]`. That keeps one canonical rendering path and makes prev/next navigation trivial (just `<Link href={`/day/${prevDate}`}>`).

### 6.6 The `/day/[date]` page

Server component. Validates the `date` param (yyyy-mm-dd, not future beyond today in user's tz). Fetches all data in parallel and hands it to a client component.

```tsx
export default async function DayPage({ params }: { params: { date: string } }) {
  // 1. Validate params.date
  // 2. Fetch in parallel:
  //    - user_config
  //    - focus_periods (all — filter client-side by day-of-week)
  //    - active short_term_goals + their current in-progress goal_cycle
  //    - day_plan for (user, date), plus its assignments + non-productive goals
  //      (If no day_plan exists AND date === today, create one; if past, treat as empty read-only.)
  // 3. Compute prev/next date strings (only allow next if not today)
  // 4. Return <DayView data={...} isToday={...} isPast={...} />
}
```

Notes:
- **Read-only mode for past days**: `isPast === true && date !== today` → hide assign UI, hide check/cross buttons; leave journal editing enabled.
- **Future dates**: middleware/redirect to today. Don't allow planning ahead in MVP.

### 6.7 `<DayView>` client component

Owns the whole calendar UI. Uses TanStack Query for local mutations with optimistic updates. Structure:

```
<DayView>
  <header>
    <PrevNextNav prev={prevDate} next={nextDate} disabled={...} />
    <CompletionBadge value={completionPct} />
  </header>
  <MottoStrip today={date} />   // (see 6.8 — optional decoration)
  <div className="calendar">
    {slotsOrBands.map(item =>
      item.type === 'sleep' ? <SleepBand ... /> : <TimeSlot ... />
    )}
  </div>
  <NonProductiveSection dayPlanId={...} goals={nonProductive} readOnly={isPast} />
  {activeModal && ...}   // GoalPicker / CheckConfirm / CrossConfirm / OffFocusWarning / JournalEditor
  {hoorayVisible && <HoorayPopup />}
</DayView>
```

**TimeSlot** — one 30-min block. Shows:
- Time label (e.g. `09:30`)
- Focus tint (background hue derived from focus_period.color at 15% opacity, if in one)
- If empty and today: tap opens `<GoalPicker>` scoped to that slot.
- If assigned: shows `<GoalAssignmentCard>` with title, time range, check/cross buttons, journal icon, warning icon if off-focus.

**GoalAssignmentCard** — status-driven visuals:
- `pending` → outlined card, check + cross buttons
- `checked` → filled with `blue-400/20`, small `✓`, edit-journal only
- `crossed` → outlined with `border-blue-300/50`, small `✗`, edit-journal only
- `auto_failed` → same as crossed but with tag "auto-failed at noon" (Phase D writes this state; Phase C only renders it)

### 6.8 Motto strip (optional in Phase C, recommended)

If you can spare the effort, show today's motto at the top of the day view — deterministic by day-of-year modulo 5. Full check-in flow is Phase D, but showing the motto here is trivial (query `mottos` server-side) and matches the ethos.

### 6.9 Modals

Match the spec's exact copy:
- **CheckConfirm**: "Are you sure you truthfully completed this goal?" + effort 1–5 slider (or 5 radio buttons) — **required**. Two buttons: `Yes, done` / `Cancel`.
- **CrossConfirm**: "Are you sure you were not able to complete this goal?" + optional journal collapsible. Two buttons: `Confirm` / `Cancel`.
- **OffFocusWarning**: shown INSIDE the goal picker when the chosen slot is off-focus. Copy: "This slot is a low-focus (or unmarked) period. Place it here anyway?"
- **HoorayPopup**: full-viewport dim overlay, one line — e.g. "Hooray. That's one." — auto-dismisses after 1500ms; also dismissable on tap.

All modals: `role="dialog"`, `aria-modal="true"`, ESC closes cancel-safe modals but not confirmation modals mid-action.

### 6.10 Completion badge

Formula: `checked / (checked + crossed + auto_failed)` × 100, rounded, for today only. Show `—` if there are zero resolved assignments. Doesn't include pending. Doesn't include non-productive goals (spec is explicit: non-productive goals aren't part of the promotion/demotion metric — keep them out of the completion number for consistency).

Rendered top-right, above the "Settings" link. Two-digit big number in `blue-200`, "Completion" label in `gray-fade` uppercase small caps.

### 6.11 Prev/Next navigation

- Prev link: always enabled if a day_plan exists on prev date OR prev date is within last 90 days. (You can also make it always enabled — clicking it creates a day_plan on demand… actually don't. Only render prev if there's data on that day. Otherwise use `/stats`-like list in the future. For MVP: always render prev going back arbitrarily; day view for a bare past date shows an empty read-only calendar.)
- Next link: disabled if current view is today (or future date, which we blocked at the page level).
- Keyboard: `useEffect` binds `keydown` on `ArrowLeft` / `ArrowRight`. Left → prev, Right → next (if enabled).
- Touch: use a light-weight swipe detector — e.g. capture `touchstart` X and `touchend` X, if delta > 60px trigger. No library needed. If you'd rather ship without swipe in Phase C, that's acceptable; call it out.

---

## 7. UX rules

- **Palette**: black + blue only. No greens, reds, ambers. Success is `blue-400`. Failure/warning is `blue-300` with reduced opacity + border thickness change. Never introduce a new hue.
- **Tap targets**: buttons must include the `tap-target` utility (44×44 min).
- **Motion**: fade-in on modals (~120ms). Hooray uses a subtle scale-in + fade. No bouncy easing.
- **Copy tone**: sparse, honest, second-person. See existing pages ([app/(onboarding)/welcome/page.tsx](../app/(onboarding)/welcome/page.tsx), [app/(onboarding)/limits/limits-form.tsx](../app/(onboarding)/limits/limits-form.tsx)) for the voice.
- **Focus visible**: keep `outline-none focus:border-blue-400` pattern already used on inputs. Extend to slot buttons.
- **Disabled state**: `disabled:opacity-40` (matches existing Button component).

---

## 8. Edge cases to handle

1. **User has no focus_periods defined** — allow assignment but always show off-focus warning.
2. **User has no short_term_goals active** — the picker should show a message: "You have no active short-term goals. Add one in Settings → Goals." and a link.
3. **Assignment overlap** — the server action must return an error; the client should surface it inline in the picker.
4. **Sleep window wraps midnight** — most common case. Handle in `buildDayGrid`.
5. **Sleep window = 0 minutes** (edge validation should prevent this in Phase B, but guard anyway) — treat as no sleep collapse.
6. **User's timezone changes on the device** — outside Phase C scope; assume `user_config.timezone` is source of truth.
7. **Historical day with no `day_plan`** — render an empty read-only calendar with a "No plan was created for this day." message. Don't auto-create.
8. **Assignment status = `auto_failed`** — Phase D creates this; Phase C only needs to render it correctly (grayed out, "auto-failed at noon" tag).
9. **Non-productive goal deletion** — upsertNonProductiveGoal with empty title deletes the row.
10. **Effort field required** — even a slider default (e.g. start at 3) doesn't count as "the user answered"; require an explicit interaction. Consider showing an unselected state on first render and disabling the confirm button until touched. Or accept the default with a "Confirm" button — user's call. Recommend: **require touch** (start with no value, disable confirm).

---

## 9. Verification checklist

Before declaring Phase C done, walk through this in `npm run dev`:

1. Sign in on a fresh account, complete onboarding, land on `/today`. Expected: `/today` redirects to `/day/[today]`.
2. Calendar renders. Sleep hours are collapsed into a single band. High-focus periods show a subtle blue tint. Times align to 30-min slots.
3. Tap an empty slot in a high-focus period → picker opens → pick a short-term goal → assignment appears in that slot. No off-focus warning.
4. Tap an empty slot outside any focus period → picker opens → off-focus warning shows → confirm anyway → assignment appears with warning badge.
5. Tap the check button on a pending assignment → confirm modal appears with effort 1–5 → set effort to 4 → confirm → hooray popup → card flips to `checked` state → completion badge increments.
6. Tap cross on a pending assignment → confirm modal → optional journal → confirm → card flips to `crossed`.
7. Open journal editor on any assignment (resolved or pending) → add mood/technique/notes → save → reloads with journal persisted.
8. Enter titles for 3 non-productive goals → each shows check/cross → resolve one → status persists on reload.
9. Press ArrowLeft → route changes to `/day/[yesterday]` → renders as read-only if no data.
10. Press ArrowRight from yesterday → returns to today.
11. Try to type `/day/[future-date]` in the URL → redirected back to `/today`.
12. Sign in as a second account → verify no data leaks from account 1 (RLS test).
13. `npm run build` passes (no TS or ESLint errors).

---

## 10. Committing

Per [../CLAUDE.md](../CLAUDE.md):
- Commit after multiple files added OR >20 lines changed. That's guaranteed here.
- Include the co-author trailer used in previous phases (see `git log` for exact format).
- Push to `origin/main` after commit.

Suggested commit message shape:
```
Phase C: daily calendar + check-off + journaling

- /day/[date] server component + <DayView> client component with 24h
  30-min grid; sleep hours collapsed into a single band
- Tap-to-place goal picker with off-focus warning; RLS-guarded server
  actions for assign/unassign/check/cross/journal
- Three non-productive goal slots per day (no promotion/demotion applied)
- Effort 1–5 required at check-off (strict mode); effort_events audit log
  written on every resolution
- Hooray popup on check; matching confirm copy from spec
- Real completion badge (top-right); prev/next day nav via keyboard + swipe
- TanStack Query wired via <Providers>; optimistic updates on check/cross

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## 11. Environment gotchas to avoid (learned in Phase A/B)

1. **Node install**: Node was installed via `nvm` (Node LTS). Source it in every fresh shell:
   ```bash
   export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
   ```
2. **`.env.local` overwriting**: When you run `npm run build` to check types, **do not** write placeholder values to `.env.local` — that clobbers the user's real Supabase credentials and the app breaks on next `npm run dev`. Instead:
   - Read `.env.local` first, save its contents.
   - Set placeholder env vars inline for that build command only, e.g. `NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x npm run build` — this way the file is untouched.
   - If `.env.local` doesn't exist at all, that's the only case where you can safely create it — but delete it after the build.
3. **Route groups vs URL segments**: `(auth)` and `(app)` in the app dir are **route groups** — they don't add to the URL. Real URL segments must live in non-parenthesized folders (see [app/auth/callback/route.ts](../app/auth/callback/route.ts) — that's a real `/auth/callback`, not `/(auth)/callback`).
4. **Server actions cannot be exported from client components** — put them in a separate `actions.ts` and import into the client component.
5. **After Supabase schema changes**: no schema changes needed in Phase C. If you find yourself needing one, add a new numbered migration (`supabase/migrations/0002_*.sql`) — don't edit `0001`.
6. **`.claude/settings.local.json` is currently untracked but NOT gitignored.** If you use `git add -A`, you may commit sensitive data. Prefer explicit `git add <path>` per file, or first add `.claude/` to `.gitignore`.

---

## 12. Suggested execution order

Keep the walking-skeleton principle. Ship a working end-to-end thin slice, then thicken.

1. **Providers wrapper** + wire into layout — 10 lines.
2. **Calendar math** in `lib/engine/day-calendar.ts` + a couple of unit tests (or throwaway console verification) for the sleep-wrap case.
3. **`/day/[date]` server page** with static (non-interactive) render: sleep collapsed, focus tint, slot labels. No interactions yet.
4. **`/today` redirect** to `/day/[today]`.
5. **GoalPicker + assignGoalToSlot** — first mutation working end-to-end.
6. **Assignment card + check/cross buttons + confirm modals + effort capture** — the payoff.
7. **Hooray popup + completion badge**.
8. **Journal editor** on assignment cards.
9. **Non-productive section** (3 slots).
10. **Prev/next nav** (keyboard; swipe if time).
11. **Verification pass** against §9.
12. **Commit + push**.

---

## 13. What to hand back at the end

Once done, tell the user:
- Which routes are new/changed and what they do.
- Any Phase D/E hooks you left as TODOs (e.g. "auto_failed rendering is stubbed; Phase D writes that state").
- The output of the verification checklist — which items you tested and any that need manual real-device confirmation (e.g. swipe gestures).
- The commit hash + confirmation of push.
