import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FocusHoursEditor } from "@/app/(onboarding)/focus-hours/focus-hours-editor";

export default async function SettingsFocusHoursPage() {
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
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <Link
        href="/settings"
        className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
      >
        ← Settings
      </Link>
      <h1 className="mt-4 mb-10 text-2xl font-medium tracking-tight">
        Focus hours
      </h1>
      <FocusHoursEditor periods={periods ?? []} nextHref="/settings" />
    </main>
  );
}
