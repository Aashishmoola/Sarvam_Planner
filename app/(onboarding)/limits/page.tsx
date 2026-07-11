import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StepHeader } from "@/components/ui/step-header";
import { LimitsForm } from "./limits-form";

export default async function LimitsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: config } = await supabase
    .from("user_config")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <>
      <StepHeader
        step={2}
        total={5}
        title="Your limits"
        subtitle="Start deliberately low. The app raises these once you complete two full cycles."
      />
      <LimitsForm
        initial={{
          max_long_goals: config?.max_long_goals ?? 3,
          max_short_goals: config?.max_short_goals ?? 1,
          max_productive_hours: config?.max_productive_hours ?? 2,
          sleep_start: config?.sleep_start ?? "23:00",
          sleep_end: config?.sleep_end ?? "07:00",
          morning_push_at: config?.morning_push_at ?? "08:00",
          timezone: config?.timezone ?? "UTC",
        }}
        nextHref="/focus-hours"
      />
    </>
  );
}
