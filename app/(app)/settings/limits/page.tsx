import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LimitsForm } from "@/app/(onboarding)/limits/limits-form";

export default async function SettingsLimitsPage() {
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
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <Link
        href="/settings"
        className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
      >
        ← Settings
      </Link>
      <h1 className="mt-4 mb-10 text-2xl font-medium tracking-tight">Limits</h1>
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
        nextHref="/settings"
      />
    </main>
  );
}
