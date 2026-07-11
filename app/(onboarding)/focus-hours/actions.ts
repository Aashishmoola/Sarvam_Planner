"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { focusPeriodSchema } from "@/lib/validation/focus-periods";

export type FocusPeriodsState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function addFocusPeriod(
  _prev: FocusPeriodsState,
  formData: FormData,
): Promise<FocusPeriodsState> {
  const parsed = focusPeriodSchema.safeParse({
    label: formData.get("label"),
    color: formData.get("color"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    intensity: formData.get("intensity"),
    days_of_week: formData
      .getAll("days_of_week")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
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

  const { error } = await supabase.from("focus_periods").insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (error) return { error: error.message };
  revalidatePath("/focus-hours");
  return {};
}

export async function deleteFocusPeriod(id: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("focus_periods")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/focus-hours");
}

export async function finishFocusHours(redirectTo: string) {
  redirect(redirectTo);
}
