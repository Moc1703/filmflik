import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, requireSubscription } from "@/lib/supabase/env";
import { resolveWatchAccess } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Debug / client helper for entitlement state. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      canWatch: false,
      requireSubscription: requireSubscription(),
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await resolveWatchAccess();

  return NextResponse.json({
    configured: true,
    signedIn: Boolean(user),
    canWatch: access.ok,
    reason: access.ok ? null : access.reason,
    requireSubscription: requireSubscription(),
  });
}
