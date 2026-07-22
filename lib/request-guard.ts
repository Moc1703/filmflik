import "server-only";

import type { NextRequest } from "next/server";

function hostFromUrl(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/** App host + localhost + PLAYBACK_ALLOWED_ORIGINS (reused as the trusted origin list). */
export function allowedRequestHosts(request: NextRequest): Set<string> {
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
 * For state-changing POSTs: require an Origin header that matches the app.
 * Blocks cross-site / scripted calls from other domains. A missing Origin
 * (non-browser client) is rejected too, since real signups come from the site.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = hostFromUrl(origin);
  if (!host) return false;
  return allowedRequestHosts(request).has(host);
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * In-memory fixed-window rate limit. Best-effort on serverless
 * (per-instance, resets on cold start) — adds friction, not a hard cap.
 * Returns true when the request is allowed.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup to bound memory.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (now >= b.resetAt) buckets.delete(k);
      }
    }
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
