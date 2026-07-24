import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayInTz, dayOfYear } from "@/lib/time/today";

export default async function CheckInPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: config } = await supabase
    .from("user_config")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const tz = config?.timezone ?? "UTC";
  const today = todayInTz(tz);

  // Ensure today's day_plan exists, then stamp check-in (only the first visit).
  const { data: plan } = await supabase
    .from("day_plans")
    .upsert(
      { user_id: user.id, date: today },
      { onConflict: "user_id,date", ignoreDuplicates: true },
    )
    .select("id,check_in_completed_at")
    .maybeSingle();
  const planRow =
    plan ??
    (await supabase
      .from("day_plans")
      .select("id,check_in_completed_at")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()).data;

  let checkedInAt: string | null = planRow?.check_in_completed_at ?? null;
  if (planRow && !checkedInAt) {
    const now = new Date().toISOString();
    await supabase
      .from("day_plans")
      .update({ check_in_completed_at: now })
      .eq("id", planRow.id)
      .is("check_in_completed_at", null);
    checkedInAt = now;
  }

  // Today's motto (deterministic cycle through the user's 5 mottos).
  const { data: mottos } = await supabase
    .from("mottos")
    .select("position,text")
    .eq("user_id", user.id)
    .order("position", { ascending: true });
  const mottoList = (mottos ?? []).map((m) => m.text);
  const motto =
    mottoList.length > 0 ? mottoList[dayOfYear(today) % mottoList.length] : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-16">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-gray-fade">
          Good morning
        </p>
      </header>

      {motto ? (
        <p className="mb-12 border-l-2 border-blue-400 pl-4 text-2xl font-medium tracking-tight text-blue-50">
          {motto}
        </p>
      ) : (
        <p className="mb-12 text-sm text-gray-fade">
          No mottos set yet — add five in{" "}
          <Link href="/settings/mottos" className="text-blue-400 hover:underline">
            Settings → Mottos
          </Link>
          .
        </p>
      )}

      <ul className="mb-12 space-y-3 text-sm text-blue-50">
        <li className="flex gap-3">
          <span className="text-blue-400">•</span>
          <span>
            Goals must be checked off by midnight tonight, or they&apos;re
            auto-marked as failed.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-blue-400">•</span>
          <span>Add goal details or adjust short-term goals if needed.</span>
        </li>
      </ul>

      <div className="space-y-3">
        <Link
          href={`/day/${today}`}
          className="tap-target inline-flex w-full items-center justify-center bg-blue-400 border border-blue-400 px-5 py-3 text-sm tracking-wide text-blue-100 hover:bg-blue-500"
        >
          Plan today
        </Link>
        {checkedInAt && (
          <p className="text-center text-xs text-gray-fade">
            Checked in for today.
          </p>
        )}
      </div>
    </main>
  );
}
