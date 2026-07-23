"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveFocusPeriodsSchema } from "@/lib/validation/focus-periods";

export type FocusPeriodsState = { error?: string };

/**
 * Replace the user's focus periods with the painted block runs from the
 * focus-hours editor. Each run becomes one focus_periods row applied to
 * every day of the week (the editor paints a daily template).
 */
export async function saveFocusPeriods(
  input: unknown,
): Promise<FocusPeriodsState> {
  const parsed = saveFocusPeriodsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please assign every waking block before continuing." };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Replace the whole set atomically: delete then insert.
  const { error: delErr } = await supabase
    .from("focus_periods")
    .delete()
    .eq("user_id", user.id);
  if (delErr) return { error: delErr.message };

  if (parsed.data.periods.length > 0) {
    const rows = parsed.data.periods.map((p) => ({
      user_id: user.id,
      label: p.label,
      color: p.color,
      start_time: p.start_time,
      end_time: p.end_time,
      intensity: p.intensity,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    }));
    const { error: insErr } = await supabase.from("focus_periods").insert(rows);
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/focus-hours");
  revalidatePath("/settings/focus-hours");
  revalidatePath("/today");
  return {};
}

export async function finishFocusHours(redirectTo: string) {
  redirect(redirectTo);
}
