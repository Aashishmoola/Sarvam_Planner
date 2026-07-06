import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen px-6 py-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Today</h1>
          <p className="text-xs text-gray-fade">
            Signed in as {user?.email}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-gray-fade">
            Completion
          </div>
          <div className="text-2xl font-medium text-blue-200">0%</div>
        </div>
      </header>

      <section className="mt-16">
        <p className="text-sm text-gray-fade">
          Phase A skeleton. Onboarding, calendar, and check-in flows arrive in Phase B–D.
        </p>
      </section>
    </main>
  );
}
