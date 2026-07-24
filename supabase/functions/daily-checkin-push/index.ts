// daily-checkin-push — scheduled hourly.
// Sends the morning nudge to each user whose local time is within their
// morning_push_at hour and who hasn't checked in today. Uses Web Push
// (VAPID). Deletes stale subscriptions on 410/404.
//
// Env (set as Edge Function secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_KEY  (or legacy SUPABASE_SERVICE_ROLE_KEY)
//   VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function localHour(tz: string): number {
  try {
    const s = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    return Number.parseInt(s, 10) % 24;
  } catch {
    return new Date().getHours();
  }
}

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

async function sendToUser(userId: string): Promise<number> {
  const payload = JSON.stringify({
    title: "Sarvam Planner",
    body: "One nudge. Show up.",
    url: "/check-in",
  });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", userId);

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (err) {
      const status = err?.statusCode;
      if (status === 410 || status === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", s.endpoint)
          .eq("user_id", userId);
      } else {
        console.error("push failed", s.endpoint, err?.message);
      }
    }
  }
  return sent;
}

Deno.serve(async () => {
  if (!SERVICE_KEY || !VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response("misconfigured", { status: 500 });
  }

  const { data: configs, error } = await supabase
    .from("user_config")
    .select("user_id,timezone,morning_push_at,push_enabled");

  if (error) {
    console.error("user_config fetch failed", error.message);
    return new Response("error", { status: 500 });
  }

  let totalSent = 0;
  for (const cfg of configs ?? []) {
    if (!cfg.push_enabled) continue;
    const targetHour = Number.parseInt(String(cfg.morning_push_at).slice(0, 2), 10);
    if (Number.isNaN(targetHour)) continue;
    if (localHour(cfg.timezone ?? "UTC") !== targetHour) continue;

    // Skip if the user already checked in today.
    const today = todayInTz(cfg.timezone ?? "UTC");
    const { data: plan } = await supabase
      .from("day_plans")
      .select("check_in_completed_at")
      .eq("user_id", cfg.user_id)
      .eq("date", today)
      .maybeSingle();
    if (plan?.check_in_completed_at) continue;

    totalSent += await sendToUser(cfg.user_id);
  }

  return Response.json({ ok: true, sent: totalSent });
});
