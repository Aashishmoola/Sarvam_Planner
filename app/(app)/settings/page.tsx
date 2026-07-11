import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

const SECTIONS = [
  { href: "/settings/limits", title: "Limits", desc: "Max goals, productive hours, sleep window, morning nudge time" },
  { href: "/settings/focus-hours", title: "Focus hours", desc: "Your high- and low-focus windows" },
  { href: "/settings/goals", title: "Goals", desc: "Long-term and short-term goals" },
  { href: "/settings/mottos", title: "Mottos", desc: "The five lines cycled on morning check-in" },
];

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <header className="mb-10">
        <Link
          href="/today"
          className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
        >
          ← Today
        </Link>
        <h1 className="mt-4 text-2xl font-medium tracking-tight">Settings</h1>
        <p className="mt-1 text-xs text-gray-fade">
          Signed in as {user?.email}
        </p>
      </header>

      <nav className="space-y-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block border border-gray-soft px-4 py-4 transition-colors hover:border-blue-400"
          >
            <div className="text-sm text-blue-50">{s.title}</div>
            <div className="mt-1 text-xs text-gray-fade">{s.desc}</div>
          </Link>
        ))}
      </nav>

      <div className="mt-12 border-t border-gray-soft pt-6">
        <form action={signOut}>
          <button
            type="submit"
            className="tap-target text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
