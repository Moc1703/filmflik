import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  hasServiceRole,
} from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  clientIp,
  isSameOriginRequest,
  rateLimit,
} from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max signups per IP per window (best-effort; CAPTCHA in Supabase is the hard gate).
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

/**
 * Creates a confirmed user without sending Supabase auth emails
 * (avoids free-tier email rate limits).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !hasServiceRole()) {
    return NextResponse.json(
      { error: "Auth is not configured" },
      { status: 503 }
    );
  }

  // Only accept same-origin browser submissions.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Throttle mass account creation per IP.
  if (!rateLimit(`signup:${clientIp(request)}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Try again later." },
      { status: 429 }
    );
  }

  let body: {
    email?: string;
    password?: string;
    displayName?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";
  const displayName = body.displayName?.trim() || undefined;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : undefined,
    });

    if (error) {
      const msg = error.message || "Sign up failed";
      const status =
        /already|registered|exists/i.test(msg) ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id ?? null,
    });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json(
      { error: "Sign up failed" },
      { status: 500 }
    );
  }
}
