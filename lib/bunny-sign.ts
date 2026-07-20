import { createHash } from "crypto";
import { getBunnyCdnBase } from "@/lib/cdn";

export type BunnyTokenMode = "md5" | "sha256";

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizePath(path: string): string {
  const clean = path.replace(/^\//, "");
  return `/${clean}`;
}

/**
 * Sign a Bunny CDN URL (Token Authentication).
 * Enable Token Authentication on your Pull Zone and set BUNNY_TOKEN_KEY.
 *
 * Modes:
 * - md5: Basic token auth (legacy)
 * - sha256: Advanced token auth (recommended)
 *
 * @see https://docs.bunny.net/cdn/security/token-authentication
 */
export function signBunnyUrl(
  pathOrUrl: string,
  options?: {
    expiresInSeconds?: number;
    userIp?: string;
    mode?: BunnyTokenMode;
  }
): { url: string; expiresAt: number } {
  const securityKey = process.env.BUNNY_TOKEN_KEY;
  const expiresIn =
    options?.expiresInSeconds ??
    Number(process.env.BUNNY_TOKEN_TTL || 7200);
  const mode =
    options?.mode ||
    ((process.env.BUNNY_TOKEN_AUTH_MODE as BunnyTokenMode) || "sha256");

  let path: string;
  let baseHost: string;

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const parsed = new URL(pathOrUrl);
    path = parsed.pathname;
    baseHost = `${parsed.protocol}//${parsed.host}`;
  } else {
    path = normalizePath(pathOrUrl);
    baseHost = getBunnyCdnBase();
  }

  const expiresAt = Math.round(Date.now() / 1000) + expiresIn;

  // Without a key: return unsigned URL (dev / token auth off)
  if (!securityKey) {
    return {
      url: `${baseHost}${path}`,
      expiresAt: 0,
    };
  }

  const signaturePath = path;
  let hashableBase = securityKey + signaturePath + String(expiresAt);
  if (options?.userIp) {
    hashableBase += options.userIp;
  }

  const token =
    mode === "md5"
      ? toBase64Url(createHash("md5").update(hashableBase, "utf8").digest())
      : toBase64Url(createHash("sha256").update(hashableBase, "utf8").digest());

  const url = `${baseHost}${signaturePath}?token=${token}&expires=${expiresAt}`;
  return { url, expiresAt };
}

export function isBunnyTokenConfigured(): boolean {
  return Boolean(process.env.BUNNY_TOKEN_KEY);
}
