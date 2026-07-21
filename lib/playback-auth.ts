import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const PLAYBACK_COOKIE = "ff_playback";
const DEFAULT_TTL_SEC = 2 * 60 * 60;

function playbackSecret(): string | null {
  const explicit =
    process.env.PLAYBACK_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim();
  return explicit || null;
}

function playbackTtlSec(): number {
  const n = Number(process.env.PLAYBACK_SESSION_TTL || DEFAULT_TTL_SEC);
  return Number.isFinite(n) && n > 60 ? Math.floor(n) : DEFAULT_TTL_SEC;
}

export function createPlaybackSessionToken(): string | null {
  const secret = playbackSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + playbackTtlSec();
  const payload = String(exp);
  const sig = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyPlaybackSessionToken(
  token: string | undefined | null
): boolean {
  if (!token) return false;
  const secret = playbackSecret();
  if (!secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function hostFromUrl(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Hosts allowed to request media (Referer / Origin). */
export function allowedPlaybackHosts(request: NextRequest): Set<string> {
  const hosts = new Set<string>();
  hosts.add(request.nextUrl.host.toLowerCase());
  hosts.add("localhost");
  hosts.add("127.0.0.1");

  const extra = process.env.PLAYBACK_ALLOWED_ORIGINS?.split(",") || [];
  for (const raw of extra) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.includes("://")) {
      const h = hostFromUrl(trimmed);
      if (h) hosts.add(h);
    } else {
      hosts.add(trimmed.toLowerCase().replace(/\/$/, ""));
    }
  }
  return hosts;
}

/**
 * True when Referer/Origin is missing (some clients) or matches allowlist.
 * Rejects cross-site hotlinks that send a foreign Referer.
 */
export function isPlaybackRefererAllowed(request: NextRequest): boolean {
  const allowed = allowedPlaybackHosts(request);
  const referer = request.headers.get("referer");
  const origin = request.headers.get("origin");

  if (referer) {
    const host = hostFromUrl(referer);
    if (!host || !allowed.has(host)) return false;
  }
  if (origin) {
    const host = hostFromUrl(origin);
    if (!host || !allowed.has(host)) return false;
  }
  return true;
}

export function hasValidPlaybackSession(request: NextRequest): boolean {
  if (!playbackSecret()) {
    // Misconfigured — fail closed for media once password/secret should exist.
    // Dev without ADMIN_PASSWORD: allow (local convenience).
    return process.env.NODE_ENV !== "production";
  }
  return verifyPlaybackSessionToken(
    request.cookies.get(PLAYBACK_COOKIE)?.value
  );
}

export function assertPlaybackAccess(
  request: NextRequest
): NextResponse | null {
  if (!isPlaybackRefererAllowed(request)) {
    return NextResponse.json(
      { error: "Playback blocked — invalid referer" },
      { status: 403 }
    );
  }
  if (!hasValidPlaybackSession(request)) {
    return NextResponse.json(
      { error: "Playback session required" },
      { status: 401 }
    );
  }
  return null;
}

export function attachPlaybackCookie(res: NextResponse): NextResponse {
  const token = createPlaybackSessionToken();
  if (!token) return res;
  res.cookies.set(PLAYBACK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: playbackTtlSec(),
  });
  return res;
}
