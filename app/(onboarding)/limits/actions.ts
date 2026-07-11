"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { limitsSchema } from "@/lib/validation/limits";

export type LimitsState = { error?: string; fieldErrors?: Record<string, string> };

export async function saveLimits(
  redirectTo: string,
  _prev: LimitsState,
  formData: FormData,
): Promise<LimitsState> {
  const parsed = limitsSchema.safeParse({
    max_long_goals: formData.get("max_long_goals"),
    max_short_goals: formData.get("max_short_goals"),
    max_productive_hours: formData.get("max_productive_hours"),
    sleep_start: formData.get("sleep_start"),
    sleep_end: formData.get("sleep_end"),
    morning_push_at: formData.get("morning_push_at"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key) fieldErrors[key] = issue.message;
    }
    return { error: "Please check the fields", fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase.from("user_config").upsert(
    {
      user_id: user.id,
      ...parsed.data,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(redirectTo);
}
