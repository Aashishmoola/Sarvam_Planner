import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayInTz } from "@/lib/time/today";

export default async function TodayPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: config } = await supabase
    .from("user_config")
    .select("timezone,onboarded_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!config?.onboarded_at) redirect("/welcome");

  redirect(`/day/${todayInTz(config?.timezone ?? "UTC")}`);
}
