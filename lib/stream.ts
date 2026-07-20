import "server-only";

import { getMovieById, type Movie } from "@/lib/movies";
import { getBunnyPathForMovie } from "@/lib/media.server";
import { signBunnyUrl, isBunnyTokenConfigured } from "@/lib/bunny-sign";
import { getBunnyCdnBase } from "@/lib/cdn";

export interface UpstreamStream {
  /** Upstream URL (Bunny signed or external). Never send this to the browser. */
  upstreamUrl: string;
  expiresAt: number;
  kind: "protected" | "external";
  tokenProtected: boolean;
}

function isAbsoluteUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isOurCdnUrl(url: string): boolean {
  try {
    const host = new URL(url).host;
    const cdnHost = new URL(getBunnyCdnBase()).host;
    return host === cdnHost;
  } catch {
    return false;
  }
}

/** Resolve upstream media URL (server-only). */
export function resolveUpstreamStream(movie: Movie): UpstreamStream {
  const bunnyPath = getBunnyPathForMovie(movie.id);
  if (bunnyPath) {
    const signed = signBunnyUrl(bunnyPath);
    return {
      upstreamUrl: signed.url,
      expiresAt: signed.expiresAt,
      kind: "protected",
      tokenProtected: isBunnyTokenConfigured(),
    };
  }

  const source = movie.videoUrl;
  if (!source) {
    throw new Error("Movie has no video source");
  }

  if (isAbsoluteUrl(source) && isOurCdnUrl(source)) {
    const signed = signBunnyUrl(source);
    return {
      upstreamUrl: signed.url,
      expiresAt: signed.expiresAt,
      kind: "protected",
      tokenProtected: isBunnyTokenConfigured(),
    };
  }

  return {
    upstreamUrl: source,
    expiresAt: 0,
    kind: "external",
    tokenProtected: false,
  };
}

export function resolveUpstreamStreamById(id: string): UpstreamStream | null {
  const movie = getMovieById(id);
  if (!movie) return null;
  return resolveUpstreamStream(movie);
}

/** Same-origin playback path for the player (no CDN hostname). */
export function getPlaybackPath(movieId: string): string {
  return `/api/media/${movieId}`;
}
