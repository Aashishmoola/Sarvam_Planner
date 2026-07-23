import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayInTz, addDaysUTC } from "@/lib/time/today";
import { DayView } from "../../_calendar/day-view";
import type {
  AssignmentRow,
  DayData,
  DayPlanRow,
  FocusPeriodRow,
  NonProductiveRow,
  ShortTermGoalRow,
} from "../../_calendar/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DayPage({
  params,
}: {
  params: { date: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: config } = await supabase
    .from("user_config")
    .select(
      "sleep_start,sleep_end,timezone,max_productive_hours,onboarded_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (!config?.onboarded_at) redirect("/welcome");

  const tz = config.timezone ?? "UTC";
  const today = todayInTz(tz);

  if (!DATE_RE.test(params.date)) redirect("/today");
  if (params.date > today) redirect("/today");

  const isToday = params.date === today;
  const isPast = params.date < today;
  const prevDate = addDaysUTC(params.date, -1);
  const nextDate = isToday ? null : addDaysUTC(params.date, 1);

  // Parallel fetch of everything the day view needs.
  const [focusRes, goalsRes, cyclesRes, mottosRes] = await Promise.all([
    supabase
      .from("focus_periods")
      .select("id,label,color,start_time,end_time,intensity,days_of_week")
      .eq("user_id", user.id),
    supabase
      .from("short_term_goals")
      .select(
        "id,title,cycle_length_days,difficulty_level,status,retired_at",
      )
      .eq("user_id", user.id)
      .is("retired_at", null),
    supabase
      .from("goal_cycles")
      .select("short_term_goal_id,ends_on,outcome")
      .eq("user_id", user.id)
      .eq("outcome", "in_progress"),
    supabase
      .from("mottos")
      .select("position,text")
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
  ]);

  const focusPeriods: FocusPeriodRow[] = (focusRes.data ?? []).map((p) => ({
    ...p,
    start_time: String(p.start_time).slice(0, 5),
    end_time: String(p.end_time).slice(0, 5),
    intensity: p.intensity as "high" | "low",
  }));

  const cycleEndsByGoal = new Map(
    (cyclesRes.data ?? []).map((c) => [c.short_term_goal_id, c.ends_on]),
  );

  const shortTermGoals: ShortTermGoalRow[] = (goalsRes.data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    cycle_length_days: g.cycle_length_days,
    difficulty_level: g.difficulty_level,
    status: g.status,
    retired_at: g.retired_at,
    current_cycle_ends_on: cycleEndsByGoal.get(g.id) ?? null,
  }));

  const goalTitleById = new Map(shortTermGoals.map((g) => [g.id, g.title]));

  const mottos = (mottosRes.data ?? []).map((m) => m.text);

  // Day plan: auto-create only for today; past days read-only.
  let dayPlan: DayPlanRow = null;
  let assignments: AssignmentRow[] = [];
  let nonProductive: NonProductiveRow[] = [];

  if (isToday) {
    const { data: plan } = await supabase
      .from("day_plans")
      .upsert(
        { user_id: user.id, date: params.date },
        { onConflict: "user_id,date", ignoreDuplicates: true },
      )
      .select("id,date")
      .maybeSingle();
    const planRow = plan ?? (await supabase
      .from("day_plans")
      .select("id,date")
      .eq("user_id", user.id)
      .eq("date", params.date)
      .maybeSingle()).data;
    if (planRow) dayPlan = { id: planRow.id, date: planRow.date };
  } else {
    const { data: plan } = await supabase
      .from("day_plans")
      .select("id,date")
      .eq("user_id", user.id)
      .eq("date", params.date)
      .maybeSingle();
    if (plan) dayPlan = { id: plan.id, date: plan.date };
  }

  if (dayPlan) {
    const [assignRes, nonProdRes] = await Promise.all([
      supabase
        .from("day_goal_assignments")
        .select(
          "id,short_term_goal_id,start_time,end_time,warning_off_focus,status,resolved_at,effort_score,journal_mood,journal_technique_tweak,journal_notes",
        )
        .eq("day_plan_id", dayPlan.id)
        .order("start_time", { ascending: true }),
      supabase
        .from("day_non_productive_goals")
        .select("id,position,title,status,resolved_at,journal_notes")
        .eq("day_plan_id", dayPlan.id)
        .order("position", { ascending: true }),
    ]);

    assignments = (assignRes.data ?? []).map((a) => ({
      ...a,
      status: a.status as AssignmentRow["status"],
      start_time: String(a.start_time).slice(0, 5),
      end_time: String(a.end_time).slice(0, 5),
      goal_title: goalTitleById.get(a.short_term_goal_id) ?? "Goal",
    }));
    nonProductive = (nonProdRes.data ?? []).map((n) => ({
      ...n,
      status: n.status as NonProductiveRow["status"],
    }));
  }

  const [y, m, d] = params.date.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  const data: DayData = {
    date: params.date,
    isToday,
    isPast,
    prevDate,
    nextDate,
    config: {
      sleep_start: String(config.sleep_start).slice(0, 5),
      sleep_end: String(config.sleep_end).slice(0, 5),
      timezone: config.timezone,
      max_productive_hours: config.max_productive_hours,
    },
    focusPeriods,
    shortTermGoals,
    dayPlan,
    assignments,
    nonProductive,
    mottos,
    dayOfWeek,
    email: user.email ?? null,
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-10">
      <header className="mb-6 flex items-baseline justify-between">
        <Link
          href="/settings"
          className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
        >
          ← Settings
        </Link>
        <span className="text-xs uppercase tracking-widest text-gray-fade">
          {data.isToday ? "Today" : data.isPast ? "Past day" : ""}
        </span>
      </header>
      <DayView data={data} />
    </main>
  );
}
