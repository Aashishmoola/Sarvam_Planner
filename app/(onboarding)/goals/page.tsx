import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StepHeader } from "@/components/ui/step-header";
import { GoalsEditor } from "./goals-editor";

export default async function GoalsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: longTerm }, { data: shortTerm }, { data: config }] =
    await Promise.all([
      supabase
        .from("long_term_goals")
        .select("id, title, description")
        .eq("user_id", user!.id)
        .is("completed_at", null)
        .is("archived_at", null)
        .order("created_at"),
      supabase
        .from("short_term_goals")
        .select("id, title, description, cycle_length_days, parent_long_term_goal_id")
        .eq("user_id", user!.id)
        .is("retired_at", null)
        .order("created_at"),
      supabase
        .from("user_config")
        .select("max_long_goals, max_short_goals")
        .eq("user_id", user!.id)
        .maybeSingle(),
    ]);

  return (
    <>
      <StepHeader
        step={4}
        total={5}
        title="Your goals"
        subtitle="Long-term goals stay until you finish them. Short-term goals run on cycles the engine adjusts."
      />
      <GoalsEditor
        longTerm={longTerm ?? []}
        shortTerm={shortTerm ?? []}
        maxLong={config?.max_long_goals ?? 3}
        maxShort={config?.max_short_goals ?? 3}
        nextHref="/mottos"
      />
    </>
  );
}
