import { NextResponse } from "next/server";
import {
  adminCookieOptions,
  ADMIN_COOKIE,
  createAdminSessionToken,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isAdminPasswordConfigured()) {
      return NextResponse.json(
        {
          error:
            "Admin password is not configured. Set ADMIN_PASSWORD in .env.local and restart the server.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { password?: string };
    const password = typeof body.password === "string" ? body.password : "";
    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    if (!token) {
      return NextResponse.json(
        { error: "Could not create session" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
    return res;
  } catch (error) {
    console.error("[admin/login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
