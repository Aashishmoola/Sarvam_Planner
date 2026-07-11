"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mottosSchema } from "@/lib/validation/mottos";

export type MottosState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function saveMottos(
  redirectTo: string | null,
  _prev: MottosState,
  formData: FormData,
): Promise<MottosState> {
  const mottos = [0, 1, 2, 3, 4].map((i) => ({
    position: i,
    text: String(formData.get(`motto_${i}`) ?? "").trim(),
  }));

  const parsed = mottosSchema.safeParse({ mottos });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const idx = issue.path[1];
      if (typeof idx === "number") {
        fieldErrors[`motto_${idx}`] = issue.message;
      }
    }
    return { error: "Each of the 5 mottos must be filled in.", fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const rows = parsed.data.mottos.map((m) => ({
    user_id: user.id,
    position: m.position,
    text: m.text,
  }));

  const { error } = await supabase
    .from("mottos")
    .upsert(rows, { onConflict: "user_id,position" });
  if (error) return { error: error.message };

  const { error: cfgErr } = await supabase
    .from("user_config")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (cfgErr) return { error: cfgErr.message };

  revalidatePath("/", "layout");
  if (redirectTo) redirect(redirectTo);
  return {};
}
