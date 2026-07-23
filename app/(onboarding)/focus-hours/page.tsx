import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StepHeader } from "@/components/ui/step-header";
import { FocusHoursEditor } from "./focus-hours-editor";

export default async function FocusHoursPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: periods }, { data: config }] = await Promise.all([
    supabase
      .from("focus_periods")
      .select("*")
      .eq("user_id", user!.id)
      .order("start_time"),
    supabase
      .from("user_config")
      .select("sleep_start,sleep_end")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  return (
    <>
      <StepHeader
        step={3}
        total={5}
        title="Your focus hours"
        subtitle="Paint every waking half-hour with a label. Goals placed outside a high-focus block will warn you later."
      />
      <FocusHoursEditor
        periods={periods ?? []}
        sleepStart={String(config?.sleep_start ?? "23:00").slice(0, 5)}
        sleepEnd={String(config?.sleep_end ?? "07:00").slice(0, 5)}
        nextHref="/goals"
      />
    </>
  );
}
