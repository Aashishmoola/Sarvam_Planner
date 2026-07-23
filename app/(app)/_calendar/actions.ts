"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assignSlotSchema,
  checkOffSchema,
  crossOffSchema,
  journalOnlySchema,
  nonProductiveResolveSchema,
  nonProductiveUpsertSchema,
} from "@/lib/validation/assignment";
import {
  hhmmToMinutes,
  isSlotOffFocus,
  type FocusPeriodLite,
} from "@/lib/engine/day-calendar";
import type {
  AssignmentRow,
  NonProductiveRow,
} from "./types";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, userId: user.id };
}

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function fetchGoalTitle(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  goalId: string,
): Promise<string> {
  const { data } = await supabase
    .from("short_term_goals")
    .select("title")
    .eq("id", goalId)
    .maybeSingle();
  return data?.title ?? "Goal";
}

/** Upsert a day_plan by (user_id, date) and return its id. */
export async function getOrCreateDayPlan(date: string): Promise<string> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("day_plans")
    .upsert(
      { user_id: userId, date },
      { onConflict: "user_id,date", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error || !data) {
    // upsert with ignoreDuplicates returns null on existing row; fetch it.
    const existing = await supabase
      .from("day_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    return existing.data!.id;
  }
  return data.id;
}

async function loadFocusPeriods(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
): Promise<FocusPeriodLite[]> {
  const { data } = await supabase
    .from("focus_periods")
    .select("start_time,end_time,intensity,color,days_of_week")
    .eq("user_id", userId);
  return (data ?? []).map((p) => ({
    start_time: String(p.start_time).slice(0, 5),
    end_time: String(p.end_time).slice(0, 5),
    intensity: p.intensity as "high" | "low",
    color: p.color,
    days_of_week: p.days_of_week as number[],
  }));
}

export async function assignGoalToSlot(
  input: unknown,
): Promise<ActionResult<AssignmentRow>> {
  const parsed = assignSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { date, short_term_goal_id, start_time, end_time } = parsed.data;
  const { supabase, userId } = await requireUser();

  // Goal must belong to the user and not be retired.
  const { data: goal } = await supabase
    .from("short_term_goals")
    .select("id,title,retired_at")
    .eq("id", short_term_goal_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!goal || goal.retired_at) {
    return { ok: false, error: "That goal isn't available." };
  }

  const dayPlanId = await getOrCreateDayPlan(date);

  // Overlap check against existing assignments on this day_plan.
  const startMin = hhmmToMinutes(start_time);
  const endMin = hhmmToMinutes(end_time);
  const { data: existing } = await supabase
    .from("day_goal_assignments")
    .select("start_time,end_time")
    .eq("day_plan_id", dayPlanId)
    .neq("status", "auto_failed");
  const overlap = (existing ?? []).some((a: { start_time: string; end_time: string }) =>
    rangesOverlap(
      startMin,
      endMin,
      hhmmToMinutes(String(a.start_time).slice(0, 5)),
      hhmmToMinutes(String(a.end_time).slice(0, 5)),
    ),
  );
  if (overlap) {
    return { ok: false, error: "That slot overlaps another goal." };
  }

  // Off-focus computation for this day-of-week.
  const focusPeriods = await loadFocusPeriods(supabase, userId);
  const dow = dayOfWeek(date);
  const warning_off_focus = isSlotOffFocus(
    { startMinutes: startMin, endMinutes: endMin },
    focusPeriods,
    dow,
  );

  const { data: row, error } = await supabase
    .from("day_goal_assignments")
    .insert({
      day_plan_id: dayPlanId,
      short_term_goal_id,
      user_id: userId,
      start_time,
      end_time,
      warning_off_focus,
      status: "pending",
    })
    .select("id,short_term_goal_id,start_time,end_time,warning_off_focus,status,resolved_at,effort_score,journal_mood,journal_technique_tweak,journal_notes")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Could not place goal." };
  }

  const assignment: AssignmentRow = {
    ...row,
    status: row.status as AssignmentRow["status"],
    start_time: String(row.start_time).slice(0, 5),
    end_time: String(row.end_time).slice(0, 5),
    goal_title: goal.title,
  };

  revalidatePath("/today");
  revalidatePath(`/day/${date}`);
  return { ok: true, data: assignment };
}

export async function unassignGoal(
  assignment_id: string,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, userId } = await requireUser();
  const { data: row } = await supabase
    .from("day_goal_assignments")
    .select("id,status")
    .eq("id", assignment_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Not found." };
  if (row.status !== "pending") {
    return { ok: false, error: "Can't remove a resolved goal." };
  }
  await supabase
    .from("day_goal_assignments")
    .delete()
    .eq("id", assignment_id)
    .eq("user_id", userId);
  revalidatePath("/today");
  return { ok: true, data: { id: assignment_id } };
}

export async function checkOffGoal(
  input: unknown,
): Promise<ActionResult<AssignmentRow>> {
  const parsed = checkOffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { supabase, userId } = await requireUser();
  const { assignment_id, effort_score, journal_mood, journal_technique_tweak, journal_notes } =
    parsed.data;

  const { data: row } = await supabase
    .from("day_goal_assignments")
    .select("id,day_plan_id,short_term_goal_id,status")
    .eq("id", assignment_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Not found." };
  if (row.status !== "pending") {
    return { ok: false, error: "Already resolved." };
  }

  const { data: updated, error } = await supabase
    .from("day_goal_assignments")
    .update({
      status: "checked",
      resolved_at: new Date().toISOString(),
      effort_score,
      journal_mood: journal_mood ?? null,
      journal_technique_tweak: journal_technique_tweak ?? null,
      journal_notes: journal_notes ?? null,
    })
    .eq("id", assignment_id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id,short_term_goal_id,start_time,end_time,warning_off_focus,status,resolved_at,effort_score,journal_mood,journal_technique_tweak,journal_notes")
    .single();
  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Could not check off." };
  }

  await supabase.from("effort_events").insert({
    user_id: userId,
    day_plan_id: row.day_plan_id,
    assignment_id: row.id,
    short_term_goal_id: row.short_term_goal_id,
    event_type: "checked",
    effort_score,
  });

  const assignment: AssignmentRow = {
    ...updated,
    status: updated.status as AssignmentRow["status"],
    start_time: String(updated.start_time).slice(0, 5),
    end_time: String(updated.end_time).slice(0, 5),
    goal_title: await fetchGoalTitle(supabase, updated.short_term_goal_id),
  };

  revalidatePath("/today");
  return { ok: true, data: assignment };
}

export async function crossOffGoal(
  input: unknown,
): Promise<ActionResult<AssignmentRow>> {
  const parsed = crossOffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { supabase, userId } = await requireUser();
  const { assignment_id, journal_mood, journal_technique_tweak, journal_notes } =
    parsed.data;

  const { data: row } = await supabase
    .from("day_goal_assignments")
    .select("id,day_plan_id,short_term_goal_id,status")
    .eq("id", assignment_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Not found." };
  if (row.status !== "pending") {
    return { ok: false, error: "Already resolved." };
  }

  const { data: updated, error } = await supabase
    .from("day_goal_assignments")
    .update({
      status: "crossed",
      resolved_at: new Date().toISOString(),
      effort_score: null,
      journal_mood: journal_mood ?? null,
      journal_technique_tweak: journal_technique_tweak ?? null,
      journal_notes: journal_notes ?? null,
    })
    .eq("id", assignment_id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id,short_term_goal_id,start_time,end_time,warning_off_focus,status,resolved_at,effort_score,journal_mood,journal_technique_tweak,journal_notes")
    .single();
  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Could not cross off." };
  }

  await supabase.from("effort_events").insert({
    user_id: userId,
    day_plan_id: row.day_plan_id,
    assignment_id: row.id,
    short_term_goal_id: row.short_term_goal_id,
    event_type: "crossed",
    effort_score: null,
  });

  const assignment: AssignmentRow = {
    ...updated,
    status: updated.status as AssignmentRow["status"],
    start_time: String(updated.start_time).slice(0, 5),
    end_time: String(updated.end_time).slice(0, 5),
    goal_title: await fetchGoalTitle(supabase, updated.short_term_goal_id),
  };

  revalidatePath("/today");
  return { ok: true, data: assignment };
}

export async function updateJournal(
  input: unknown,
): Promise<ActionResult<AssignmentRow>> {
  const parsed = journalOnlySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { supabase, userId } = await requireUser();
  const { assignment_id, journal_mood, journal_technique_tweak, journal_notes } =
    parsed.data;

  const { data: updated, error } = await supabase
    .from("day_goal_assignments")
    .update({
      journal_mood: journal_mood ?? null,
      journal_technique_tweak: journal_technique_tweak ?? null,
      journal_notes: journal_notes ?? null,
    })
    .eq("id", assignment_id)
    .eq("user_id", userId)
    .select("id,short_term_goal_id,start_time,end_time,warning_off_focus,status,resolved_at,effort_score,journal_mood,journal_technique_tweak,journal_notes")
    .single();
  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Could not save journal." };
  }

  const assignment: AssignmentRow = {
    ...updated,
    status: updated.status as AssignmentRow["status"],
    start_time: String(updated.start_time).slice(0, 5),
    end_time: String(updated.end_time).slice(0, 5),
    goal_title: await fetchGoalTitle(supabase, updated.short_term_goal_id),
  };

  revalidatePath("/today");
  return { ok: true, data: assignment };
}

export async function upsertNonProductiveGoal(
  input: unknown,
): Promise<ActionResult<NonProductiveRow | { id: string; deleted: true }>> {
  const parsed = nonProductiveUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { day_plan_id, position, title } = parsed.data;
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("day_non_productive_goals")
    .select("id")
    .eq("day_plan_id", day_plan_id)
    .eq("position", position)
    .maybeSingle();

  if (existing) {
    // Empty title deletes the row (per spec).
    if (title.trim() === "") {
      await supabase
        .from("day_non_productive_goals")
        .delete()
        .eq("id", existing.id)
        .eq("user_id", userId);
      revalidatePath("/today");
      return { ok: true, data: { id: existing.id, deleted: true } };
    }
    const { data: updated, error } = await supabase
      .from("day_non_productive_goals")
      .update({ title })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("id,position,title,status,resolved_at,journal_notes")
      .single();
    if (error || !updated) {
      return { ok: false, error: error?.message ?? "Could not save." };
    }
    revalidatePath("/today");
    return {
      ok: true,
      data: {
        ...updated,
        status: updated.status as NonProductiveRow["status"],
      },
    };
  }

  if (title.trim() === "") {
    // Nothing to insert.
    return { ok: true, data: { id: "", deleted: true } };
  }

  const { data: created, error } = await supabase
    .from("day_non_productive_goals")
    .insert({ day_plan_id, user_id: userId, position, title })
    .select("id,position,title,status,resolved_at,journal_notes")
    .single();
  if (error || !created) {
    return { ok: false, error: error?.message ?? "Could not save." };
  }
  revalidatePath("/today");
  return {
    ok: true,
    data: { ...created, status: created.status as NonProductiveRow["status"] },
  };
}

export async function resolveNonProductiveGoal(
  input: unknown,
): Promise<ActionResult<NonProductiveRow>> {
  const parsed = nonProductiveResolveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { id, action, journal_notes } = parsed.data;
  const { supabase, userId } = await requireUser();

  const { data: row } = await supabase
    .from("day_non_productive_goals")
    .select("id,day_plan_id,position,status")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Not found." };
  if (row.status !== "pending") {
    return { ok: false, error: "Already resolved." };
  }

  const newStatus = action === "check" ? "checked" : "crossed";
  const { data: updated, error } = await supabase
    .from("day_non_productive_goals")
    .update({
      status: newStatus,
      resolved_at: new Date().toISOString(),
      journal_notes: journal_notes ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id,position,title,status,resolved_at,journal_notes")
    .single();
  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Could not resolve." };
  }

  await supabase.from("effort_events").insert({
    user_id: userId,
    day_plan_id: row.day_plan_id,
    assignment_id: null,
    short_term_goal_id: null,
    event_type: action === "check" ? "checked" : "crossed",
    effort_score: null,
  });

  revalidatePath("/today");
  return {
    ok: true,
    data: { ...updated, status: updated.status as NonProductiveRow["status"] },
  };
}
