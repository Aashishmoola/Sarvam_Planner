"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  expirationTime: z.number().nullable().optional(),
});

export type NotifState = { error?: string };

/** Persist a browser push subscription for the signed-in user. */
export async function savePushSubscription(
  input: unknown,
): Promise<NotifState> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid subscription." };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
      { onConflict: "endpoint" },
    );

  if (error) return { error: error.message };

  // Ensure notifications are on when a subscription is added.
  await supabase
    .from("user_config")
    .update({ push_enabled: true })
    .eq("user_id", user.id);

  revalidatePath("/settings/notifications");
  return {};
}

/** Remove a subscription (by endpoint) — used on unsubscribe / 410 cleanup. */
export async function removePushSubscription(
  endpoint: string,
): Promise<NotifState> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  revalidatePath("/settings/notifications");
  return {};
}

/** Master toggle: pause nudges without dropping the device subscription. */
export async function setPushEnabled(
  enabled: boolean,
): Promise<NotifState> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("user_config")
    .update({ push_enabled: enabled })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings/notifications");
  return {};
}
