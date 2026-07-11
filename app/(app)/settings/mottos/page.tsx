import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MottosForm } from "@/app/(onboarding)/mottos/mottos-form";

export default async function SettingsMottosPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("mottos")
    .select("position, text")
    .eq("user_id", user!.id)
    .order("position");

  const initial: string[] = [0, 1, 2, 3, 4].map(
    (i) => existing?.find((m) => m.position === i)?.text ?? "",
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <Link
        href="/settings"
        className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
      >
        ← Settings
      </Link>
      <h1 className="mt-4 mb-10 text-2xl font-medium tracking-tight">Mottos</h1>
      <MottosForm initial={initial} nextHref="/settings" />
    </main>
  );
}
