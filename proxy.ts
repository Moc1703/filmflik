import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  mergeSessionCookies,
  updateSession,
} from "@/lib/supabase/middleware";
import { isSupabaseConfigured, requireAuthToWatch } from "@/lib/supabase/env";

const ADMIN_COOKIE = "ff_admin_session";

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return safeEqual(toBase64Url(mac), sig);
}

function adminSessionSecret(): string | null {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    null
  );
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/")
  );
}

function isAdminPublicPath(pathname: string): boolean {
  return (
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout"
  );
}

async function guardAdmin(
  request: NextRequest,
  sessionResponse: NextResponse
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!isAdminPath(pathname) || isAdminPublicPath(pathname)) {
    return null;
  }

  const secret = adminSessionSecret();
  if (!secret) {
    if (pathname.startsWith("/api/admin")) {
      return mergeSessionCookies(
        sessionResponse,
        NextResponse.json(
          { error: "Set ADMIN_PASSWORD in .env.local" },
          { status: 503 }
        )
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "config");
    return mergeSessionCookies(sessionResponse, NextResponse.redirect(url));
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const ok = token ? await verifyAdminToken(token, secret) : false;
  if (ok) return null;

  if (pathname.startsWith("/api/admin")) {
    return mergeSessionCookies(
      sessionResponse,
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return mergeSessionCookies(sessionResponse, NextResponse.redirect(url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response: sessionResponse, userId } = await updateSession(request);

  const adminDenied = await guardAdmin(request, sessionResponse);
  if (adminDenied) return adminDenied;

  const needsUser =
    (requireAuthToWatch() && pathname.startsWith("/watch/")) ||
    (isSupabaseConfigured() &&
      (pathname === "/my-list" ||
        pathname.startsWith("/my-list/") ||
        pathname === "/history" ||
        pathname.startsWith("/history/")));

  if (needsUser && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return mergeSessionCookies(sessionResponse, NextResponse.redirect(url));
  }

  // Logged-in users shouldn't sit on auth pages
  if (userId && (pathname === "/login" || pathname === "/signup")) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    url.search = "";
    return mergeSessionCookies(sessionResponse, NextResponse.redirect(url));
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/watch/:path*",
    "/login",
    "/signup",
    "/my-list",
    "/history",
    "/auth/callback",
    "/api/me/:path*",
    "/api/stream/:path*",
  ],
};
