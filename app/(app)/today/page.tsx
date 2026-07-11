import Link from "next/link";
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
        <div className="flex items-baseline gap-6">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-gray-fade">
              Completion
            </div>
            <div className="text-2xl font-medium text-blue-200">0%</div>
          </div>
          <Link
            href="/settings"
            className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
          >
            Settings
          </Link>
        </div>
      </header>

      <section className="mt-16">
        <p className="text-sm text-gray-fade">
          Daily calendar and check-in arrive in Phase C. Your onboarding data is
          saved — visit <Link href="/settings" className="text-blue-200 hover:underline">settings</Link> to review it.
        </p>
      </section>
    </main>
  );
}
