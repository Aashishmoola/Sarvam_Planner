import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GoalsEditor } from "@/app/(onboarding)/goals/goals-editor";

export default async function SettingsGoalsPage() {
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
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <Link
        href="/settings"
        className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
      >
        ← Settings
      </Link>
      <h1 className="mt-4 mb-10 text-2xl font-medium tracking-tight">Goals</h1>
      <GoalsEditor
        longTerm={longTerm ?? []}
        shortTerm={shortTerm ?? []}
        maxLong={config?.max_long_goals ?? 3}
        maxShort={config?.max_short_goals ?? 3}
        nextHref="/settings"
      />
    </main>
  );
}
