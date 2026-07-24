// midnight-autofail — scheduled hourly.
// Fails pending day_goal_assignments whose day_plan date is before the
// user's local "today" (i.e. the day rolled past midnight in their tz).
// Uses the service/secret key to bypass RLS. Writes effort_events rows.
//
// Env (set as Edge Function secrets):
//   SUPABASE_URL            — project URL (auto-provided by Supabase)
//   SUPABASE_SERVICE_KEY    — sb_secret_… (new secret key). Falls back to
//                              the legacy SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const supabase = createClient(SUPABASE_URL ?? "", SERVICE_KEY ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** yyyy-mm-dd for `now` in the given IANA timezone. */
function todayInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
}

Deno.serve(async () => {
  if (!SERVICE_KEY) return new Response("misconfigured", { status: 500 });

  const { data: configs, error } = await supabase
    .from("user_config")
    .select("user_id,timezone");

  if (error) {
    console.error("user_config fetch failed", error.message);
    return new Response("error", { status: 500 });
  }

  const now = new Date().toISOString();
  let failed = 0;

  for (const cfg of configs ?? []) {
    const today = todayInTz(cfg.timezone ?? "UTC");

    // Day plans before today still have unresolved work.
    const { data: oldPlans } = await supabase
      .from("day_plans")
      .select("id")
      .eq("user_id", cfg.user_id)
      .lt("date", today);

    const planIds = (oldPlans ?? []).map((p) => p.id);
    if (planIds.length === 0) continue;

    const { data: pending } = await supabase
      .from("day_goal_assignments")
      .select("id,day_plan_id,short_term_goal_id")
      .in("day_plan_id", planIds)
      .eq("status", "pending");

    if (!pending || pending.length === 0) continue;

    const ids = pending.map((a) => a.id);
    await supabase
      .from("day_goal_assignments")
      .update({ status: "auto_failed", resolved_at: now })
      .in("id", ids);

    await supabase.from("effort_events").insert(
      pending.map((a) => ({
        user_id: cfg.user_id,
        day_plan_id: a.day_plan_id,
        assignment_id: a.id,
        short_term_goal_id: a.short_term_goal_id,
        event_type: "auto_failed",
        effort_score: null,
      })),
    );

    failed += ids.length;
  }

  return Response.json({ ok: true, failed });
});
