import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StepHeader } from "@/components/ui/step-header";
import { FocusHoursEditor } from "./focus-hours-editor";

export default async function FocusHoursPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: periods } = await supabase
    .from("focus_periods")
    .select("*")
    .eq("user_id", user!.id)
    .order("start_time");

  return (
    <>
      <StepHeader
        step={3}
        total={5}
        title="Your focus hours"
        subtitle="Name your best (and worst) working windows. Assigning goals to a low-focus block will trigger a warning later."
      />
      <FocusHoursEditor
        periods={periods ?? []}
        nextHref="/goals"
      />
    </>
  );
}
