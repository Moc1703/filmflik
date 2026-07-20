/**
 * Bunny.net CDN helpers (public base URL only).
 * Never put BUNNY_TOKEN_KEY here — signing is server-only in lib/bunny-sign.ts
 */

const DEFAULT_CDN = "https://filmflik.b-cdn.net";

export function getBunnyCdnBase(): string {
  const base =
    process.env.NEXT_PUBLIC_BUNNY_CDN_URL?.replace(/\/$/, "") || DEFAULT_CDN;
  return base;
}

/** Build an unsigned CDN URL from a storage path (dev / non-protected only). */
export function getStreamUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const clean = path.replace(/^\//, "");
  return `${getBunnyCdnBase()}/${clean}`;
}
