import { createHash, createHmac } from "crypto";
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
 * Sign a Bunny CDN URL (Token Authentication) — file-level query token.
 * Used for Storage MP4 and server-side Stream asset fetches.
 */
export function signBunnyUrl(
  pathOrUrl: string,
  options?: {
    expiresInSeconds?: number;
    userIp?: string;
    mode?: BunnyTokenMode;
    /** Override CDN base / token key (Stream pull zone). */
    cdnBase?: string;
    tokenKey?: string;
  }
): { url: string; expiresAt: number } {
  // Only use Storage token by default. Stream must pass tokenKey explicitly
  // (or use signStreamAssetUrl) — mixing pull-zone keys causes 403.
  const securityKey =
    options?.tokenKey !== undefined
      ? options.tokenKey
      : process.env.BUNNY_TOKEN_KEY;
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
    baseHost = (options?.cdnBase || getBunnyCdnBase()).replace(/\/$/, "");
  }

  const expiresAt = Math.round(Date.now() / 1000) + expiresIn;

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

/**
 * Advanced directory token (path-based) for HLS when needed.
 * HMAC-SHA256 per Bunny advanced token docs.
 */
export function signBunnyDirectoryUrl(
  pathOrUrl: string,
  tokenPath: string,
  options?: {
    expiresInSeconds?: number;
    cdnBase?: string;
    tokenKey?: string;
  }
): { url: string; expiresAt: number } {
  const securityKey =
    options?.tokenKey !== undefined
      ? options.tokenKey
      : process.env.BUNNY_STREAM_TOKEN_KEY?.trim() ||
        process.env.BUNNY_TOKEN_KEY;
  const expiresIn =
    options?.expiresInSeconds ??
    Number(
      process.env.BUNNY_STREAM_TOKEN_TTL ||
        process.env.BUNNY_TOKEN_TTL ||
        900
    );

  let filePath: string;
  let baseHost: string;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const parsed = new URL(pathOrUrl);
    filePath = parsed.pathname;
    baseHost = `${parsed.protocol}//${parsed.host}`;
  } else {
    filePath = normalizePath(pathOrUrl);
    const rawBase = (options?.cdnBase || getBunnyCdnBase()).replace(/\/$/, "");
    baseHost = /^https?:\/\//i.test(rawBase) ? rawBase : `https://${rawBase}`;
  }

  const dirPath = tokenPath.startsWith("/") ? tokenPath : `/${tokenPath}`;
  const expiresAt = Math.round(Date.now() / 1000) + expiresIn;

  if (!securityKey) {
    return { url: `${baseHost}${filePath}`, expiresAt: 0 };
  }

  const parameterData = `token_path=${dirPath}`;
  const hashable = dirPath + String(expiresAt) + parameterData;
  const token =
    "HS256-" +
    toBase64Url(
      createHmac("sha256", securityKey).update(hashable, "utf8").digest()
    );

  const encodedTokenPath = encodeURIComponent(dirPath);
  const url = `${baseHost}/bcdn_token=${token}&expires=${expiresAt}&token_path=${encodedTokenPath}${filePath}`;
  return { url, expiresAt };
}

export function isBunnyTokenConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_TOKEN_KEY || process.env.BUNNY_STREAM_TOKEN_KEY
  );
}

/**
 * Sign a Stream CDN asset. Never uses Storage BUNNY_TOKEN_KEY (different pull zone).
 * HLS needs directory tokens so playlist + segments share one signature.
 */
export function signStreamAssetUrl(
  assetPath: string,
  options?: { expiresInSeconds?: number }
): { url: string; expiresAt: number } {
  const raw =
    process.env.BUNNY_STREAM_CDN_URL?.replace(/\/$/, "") || getBunnyCdnBase();
  const cdnBase = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const path = normalizePath(assetPath);
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY?.trim();

  if (!tokenKey) {
    // Unsigned — works only if Stream pull-zone Token Authentication is OFF.
    return { url: `${cdnBase}${path}`, expiresAt: 0 };
  }

  const videoId = path.split("/").filter(Boolean)[0];
  const tokenPath = videoId ? `/${videoId}/` : "/";
  const expiresIn =
    options?.expiresInSeconds ??
    Number(
      process.env.BUNNY_STREAM_TOKEN_TTL ||
        process.env.BUNNY_TOKEN_TTL ||
        900
    );
  return signBunnyDirectoryUrl(path, tokenPath, {
    expiresInSeconds: expiresIn,
    cdnBase,
    tokenKey,
  });
}

export function isStreamTokenConfigured(): boolean {
  return Boolean(process.env.BUNNY_STREAM_TOKEN_KEY?.trim());
}
