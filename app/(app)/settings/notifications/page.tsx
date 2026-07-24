import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotificationsManager } from "./notifications-client";

export default async function SettingsNotificationsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: config }, { count }] = await Promise.all([
    supabase
      .from("user_config")
      .select("push_enabled,morning_push_at")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <Link
        href="/settings"
        className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-400"
      >
        ← Settings
      </Link>
      <h1 className="mt-4 mb-10 text-2xl font-medium tracking-tight">
        Notifications
      </h1>

      <NotificationsManager
        pushEnabled={config?.push_enabled ?? true}
        morningPushAt={String(config?.morning_push_at ?? "08:00").slice(0, 5)}
        subscriptionCount={count ?? 0}
      />
    </main>
  );
}
