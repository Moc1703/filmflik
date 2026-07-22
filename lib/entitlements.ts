import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  isSupabaseConfigured,
  requireAuthToWatch,
  requireSubscription,
} from "@/lib/supabase/env";

export type WatchAccess =
  | { ok: true; user: User | null }
  | {
      ok: false;
      reason: "unauthenticated" | "no_subscription" | "misconfigured";
    };

/**
 * Resolves whether the current request may start / continue playback.
 * - REQUIRE_AUTH_TO_WATCH (default on when Supabase configured)
 * - REQUIRE_SUBSCRIPTION (default off): needs active/trialing sub or admin role
 */
export async function resolveWatchAccess(): Promise<WatchAccess> {
  const authRequired = requireAuthToWatch();

  if (!isSupabaseConfigured()) {
    if (authRequired) {
      return { ok: false, reason: "misconfigured" };
    }
    return { ok: true, user: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (authRequired) {
      return { ok: false, reason: "unauthenticated" };
    }
    return { ok: true, user: null };
  }

  if (!requireSubscription()) {
    return { ok: true, user };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    return { ok: true, user };
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"]);

  const now = Date.now();
  const entitled = (subs || []).some((s) => {
    if (!s.current_period_end) return true;
    return new Date(s.current_period_end).getTime() > now;
  });

  if (!entitled) {
    return { ok: false, reason: "no_subscription" };
  }

  return { ok: true, user };
}

export async function getOptionalUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
