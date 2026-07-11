"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  longTermGoalSchema,
  shortTermGoalSchema,
} from "@/lib/validation/goals";
import { todayInTz, addDaysUTC } from "@/lib/time/today";

export type GoalsState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function requireUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, userId: user.id };
}

export async function addLongTermGoal(
  _prev: GoalsState,
  formData: FormData,
): Promise<GoalsState> {
  const parsed = longTermGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Please check the fields", fieldErrors };
  }

  const { supabase, userId } = await requireUser();

  const { count } = await supabase
    .from("long_term_goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("completed_at", null)
    .is("archived_at", null);

  const { data: config } = await supabase
    .from("user_config")
    .select("max_long_goals")
    .eq("user_id", userId)
    .maybeSingle();

  const max = config?.max_long_goals ?? 3;
  if ((count ?? 0) >= max) {
    return { error: `You can have at most ${max} long-term goals.` };
  }

  const { error } = await supabase.from("long_term_goals").insert({
    user_id: userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/goals");
  return {};
}

export async function addShortTermGoal(
  _prev: GoalsState,
  formData: FormData,
): Promise<GoalsState> {
  const cycleRaw = Number(formData.get("cycle_length_days"));
  const parsed = shortTermGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    cycle_length_days: cycleRaw,
    parent_long_term_goal_id: formData.get("parent_long_term_goal_id") || null,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Please check the fields", fieldErrors };
  }

  const { supabase, userId } = await requireUser();

  const { data: config } = await supabase
    .from("user_config")
    .select("max_short_goals, timezone")
    .eq("user_id", userId)
    .maybeSingle();

  const { count } = await supabase
    .from("short_term_goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("retired_at", null);

  const max = config?.max_short_goals ?? 3;
  if ((count ?? 0) >= max) {
    return { error: `You can have at most ${max} short-term goals.` };
  }

  const { data: goal, error } = await supabase
    .from("short_term_goals")
    .insert({
      user_id: userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      cycle_length_days: parsed.data.cycle_length_days,
      parent_long_term_goal_id: parsed.data.parent_long_term_goal_id ?? null,
    })
    .select("id")
    .single();

  if (error || !goal) return { error: error?.message ?? "Failed to save" };

  const tz = config?.timezone ?? "UTC";
  const startedOn = todayInTz(tz);
  const endsOn = addDaysUTC(startedOn, parsed.data.cycle_length_days - 1);

  const { error: cycleErr } = await supabase.from("goal_cycles").insert({
    short_term_goal_id: goal.id,
    user_id: userId,
    started_on: startedOn,
    ends_on: endsOn,
    difficulty_at_start: 3,
    outcome: "in_progress",
  });

  if (cycleErr) {
    // Clean up the orphaned goal so the user can retry.
    await supabase.from("short_term_goals").delete().eq("id", goal.id);
    return { error: cycleErr.message };
  }

  revalidatePath("/goals");
  return {};
}

export async function deleteLongTermGoal(id: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("long_term_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/goals");
}

export async function deleteShortTermGoal(id: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("short_term_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/goals");
}

export async function finishGoals(redirectTo: string) {
  redirect(redirectTo);
}
