import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  clientIp,
  isSameOriginRequest,
  rateLimit,
} from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reset mails are the scarce resource (provider quota).
// Per-address is the real anti-abuse gate; the IP cap only shields the quota,
// so it stays loose — mobile carriers put many users behind one CGNAT address.
const IP_LIMIT = 15;
const EMAIL_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000;

/** Generic reply — never reveals whether an address has an account. */
const GENERIC_OK = {
  ok: true,
  message: "If that email has an account, a reset link is on its way.",
};

/**
 * Sends a Supabase recovery mail. The link lands on /auth/callback,
 * which exchanges the code for a session and forwards to /reset-password.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Auth is not configured" },
      { status: 503 }
    );
  }

  // Only accept same-origin browser submissions.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!rateLimit(`reset-ip:${clientIp(request)}`, IP_LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many reset requests. Try again later." },
      { status: 429 }
    );
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Stops one address being mail-bombed from rotating IPs.
  if (!rateLimit(`reset-mail:${email}`, EMAIL_LIMIT, WINDOW_MS)) {
    return NextResponse.json(GENERIC_OK);
  }

  const redirectTo = `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(
    "/reset-password"
  )}`;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    // Logged, not surfaced: a "user not found" reply would leak account existence.
    if (error) {
      console.error("[forgot-password]", error.message);
    }
  } catch (err) {
    console.error("[forgot-password]", err);
  }

  return NextResponse.json(GENERIC_OK);
}
