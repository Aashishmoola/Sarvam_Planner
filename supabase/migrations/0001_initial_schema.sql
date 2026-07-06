-- Sarvam Planner — initial schema
-- All tables have user_id + RLS policy `user_id = auth.uid()`.

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────────

create type short_term_goal_status as enum ('active', 'demoted', 'promoted', 'retired');
create type cycle_outcome as enum ('in_progress', 'completed', 'demoted', 'user_replaced');
create type focus_intensity as enum ('high', 'low');
create type goal_check_status as enum ('pending', 'checked', 'crossed', 'auto_failed');
create type adjustment_action as enum ('promoted', 'demoted', 'cycle_started', 'cycle_completed', 'limit_raised', 'limit_lowered');
create type effort_event_type as enum ('checked', 'crossed', 'auto_failed', 'promoted', 'demoted');

-- ────────────────────────────────────────────────────────────────
-- user_config: 1 row per user
-- ────────────────────────────────────────────────────────────────

create table user_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_long_goals int not null default 3 check (max_long_goals between 1 and 3),
  max_short_goals int not null default 1 check (max_short_goals between 1 and 3),
  max_productive_hours int not null default 2 check (max_productive_hours between 1 and 12),
  sleep_start time not null default '23:00',
  sleep_end time not null default '07:00',
  noon_cutoff time not null default '12:00',
  morning_push_at time not null default '08:00',
  timezone text not null default 'UTC',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_config enable row level security;
create policy "user_config self" on user_config
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- long_term_goals
-- ────────────────────────────────────────────────────────────────

create table long_term_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  description text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz
);

create index long_term_goals_user_active_idx
  on long_term_goals (user_id)
  where completed_at is null and archived_at is null;

alter table long_term_goals enable row level security;
create policy "long_term_goals self" on long_term_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- short_term_goals
-- ────────────────────────────────────────────────────────────────

create table short_term_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_long_term_goal_id uuid references long_term_goals(id) on delete set null,
  title text not null check (length(title) between 1 and 120),
  description text,
  cycle_length_days int not null check (cycle_length_days in (7, 14, 21)),
  difficulty_level int not null default 3 check (difficulty_level between 1 and 5),
  status short_term_goal_status not null default 'active',
  created_at timestamptz not null default now(),
  retired_at timestamptz
);

create index short_term_goals_user_active_idx
  on short_term_goals (user_id)
  where retired_at is null;

alter table short_term_goals enable row level security;
create policy "short_term_goals self" on short_term_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- goal_cycles
-- ────────────────────────────────────────────────────────────────

create table goal_cycles (
  id uuid primary key default gen_random_uuid(),
  short_term_goal_id uuid not null references short_term_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_on date not null,
  ends_on date not null,
  outcome cycle_outcome not null default 'in_progress',
  difficulty_at_start int not null check (difficulty_at_start between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create index goal_cycles_goal_idx on goal_cycles (short_term_goal_id, started_on desc);

alter table goal_cycles enable row level security;
create policy "goal_cycles self" on goal_cycles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- mottos: exactly 5 rows per user (enforced by unique(user_id, position) + app logic)
-- ────────────────────────────────────────────────────────────────

create table mottos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position int not null check (position between 0 and 4),
  text text not null check (length(text) between 1 and 200),
  updated_at timestamptz not null default now(),
  unique (user_id, position)
);

alter table mottos enable row level security;
create policy "mottos self" on mottos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- focus_periods: recurring high/low focus windows
-- ────────────────────────────────────────────────────────────────

create table focus_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (length(label) between 1 and 40),
  color text not null default '#4d84ff',
  start_time time not null,
  end_time time not null,
  intensity focus_intensity not null,
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',
  created_at timestamptz not null default now()
);

alter table focus_periods enable row level security;
create policy "focus_periods self" on focus_periods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- day_plans: one per user per date
-- ────────────────────────────────────────────────────────────────

create table day_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood text,
  check_in_completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table day_plans enable row level security;
create policy "day_plans self" on day_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- day_goal_assignments: a short-term goal placed in a time slot on a day
-- ────────────────────────────────────────────────────────────────

create table day_goal_assignments (
  id uuid primary key default gen_random_uuid(),
  day_plan_id uuid not null references day_plans(id) on delete cascade,
  short_term_goal_id uuid not null references short_term_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  warning_off_focus boolean not null default false,
  status goal_check_status not null default 'pending',
  resolved_at timestamptz,
  journal_mood text,
  journal_technique_tweak text,
  journal_notes text,
  effort_score int check (effort_score between 1 and 5),
  created_at timestamptz not null default now()
);

create index day_goal_assignments_goal_time_idx
  on day_goal_assignments (short_term_goal_id, created_at desc);
create index day_goal_assignments_day_idx
  on day_goal_assignments (day_plan_id);

alter table day_goal_assignments enable row level security;
create policy "day_goal_assignments self" on day_goal_assignments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- day_non_productive_goals: 3 per day, no promotion/demotion
-- ────────────────────────────────────────────────────────────────

create table day_non_productive_goals (
  id uuid primary key default gen_random_uuid(),
  day_plan_id uuid not null references day_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position int not null check (position between 0 and 2),
  title text not null check (length(title) between 1 and 120),
  status goal_check_status not null default 'pending',
  resolved_at timestamptz,
  journal_notes text,
  created_at timestamptz not null default now(),
  unique (day_plan_id, position)
);

alter table day_non_productive_goals enable row level security;
create policy "day_non_productive_goals self" on day_non_productive_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- push_subscriptions: one per (user, endpoint)
-- ────────────────────────────────────────────────────────────────

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (endpoint)
);

create index push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
create policy "push_subscriptions self" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- effort_events: append-only audit log for the adjustment engine
-- ────────────────────────────────────────────────────────────────

create table effort_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_plan_id uuid references day_plans(id) on delete cascade,
  assignment_id uuid references day_goal_assignments(id) on delete cascade,
  short_term_goal_id uuid references short_term_goals(id) on delete cascade,
  event_type effort_event_type not null,
  effort_score int check (effort_score between 1 and 5),
  created_at timestamptz not null default now()
);

create index effort_events_user_created_idx on effort_events (user_id, created_at desc);

alter table effort_events enable row level security;
create policy "effort_events self read" on effort_events
  for select using (user_id = auth.uid());
create policy "effort_events self insert" on effort_events
  for insert with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- adjustment_log: human-readable engine decisions
-- ────────────────────────────────────────────────────────────────

create table adjustment_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  short_term_goal_id uuid references short_term_goals(id) on delete cascade,
  action adjustment_action not null,
  reason text not null,
  applied_at timestamptz not null default now()
);

create index adjustment_log_user_idx on adjustment_log (user_id, applied_at desc);

alter table adjustment_log enable row level security;
create policy "adjustment_log self read" on adjustment_log
  for select using (user_id = auth.uid());
create policy "adjustment_log self insert" on adjustment_log
  for insert with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- Trigger: bump updated_at on user_config and mottos
-- ────────────────────────────────────────────────────────────────

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_config_touch before update on user_config
  for each row execute function touch_updated_at();
create trigger mottos_touch before update on mottos
  for each row execute function touch_updated_at();
