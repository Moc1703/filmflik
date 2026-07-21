import "server-only";

import type { CatalogEntry } from "@/lib/catalog";
import { getCatalogEntryById } from "@/lib/bunny-storage";
import {
  getStreamPlaylistPath,
  isBunnyStreamConfigured,
} from "@/lib/bunny-stream";
import {
  signStreamAssetUrl,
  isStreamTokenConfigured,
} from "@/lib/bunny-sign";

export type PlaybackFormat = "hls";

export interface UpstreamStream {
  /** Upstream URL (Bunny signed). Never send this to the browser. */
  upstreamUrl: string;
  expiresAt: number;
  kind: "protected";
  tokenProtected: boolean;
  format: PlaybackFormat;
  streamVideoId: string;
}

/** Resolve upstream HLS URL (server-only). Stream-only — no Storage MP4. */
export async function resolveUpstreamStream(
  entry: CatalogEntry
): Promise<UpstreamStream> {
  if (!entry.streamVideoId || !isBunnyStreamConfigured()) {
    throw new Error("Movie has no Bunny Stream source");
  }
  const path = getStreamPlaylistPath(entry.streamVideoId);
  const signed = signStreamAssetUrl(path);
  return {
    upstreamUrl: signed.url,
    expiresAt: signed.expiresAt,
    kind: "protected",
    tokenProtected: isStreamTokenConfigured(),
    format: "hls",
    streamVideoId: entry.streamVideoId,
  };
}

export async function resolveUpstreamStreamById(
  id: string
): Promise<UpstreamStream | null> {
  const entry = await getCatalogEntryById(id);
  if (!entry?.streamVideoId) return null;
  if (!isBunnyStreamConfigured()) return null;
  return resolveUpstreamStream(entry);
}

export async function resolveUpstreamAsset(
  entry: CatalogEntry,
  relativePath: string
): Promise<UpstreamStream | null> {
  if (!entry.streamVideoId || !isBunnyStreamConfigured()) return null;
  const clean = relativePath.replace(/^\//, "");
  const assetPath = `/${entry.streamVideoId}/${clean}`;
  const signed = signStreamAssetUrl(assetPath);
  return {
    upstreamUrl: signed.url,
    expiresAt: signed.expiresAt,
    kind: "protected",
    tokenProtected: isStreamTokenConfigured(),
    format: "hls",
    streamVideoId: entry.streamVideoId,
  };
}

/** Same-origin HLS playlist path for the player (no CDN hostname). */
export function getPlaybackPath(movieId: string): string {
  return `/api/media/${movieId}/playlist.m3u8`;
}

export { getPublicMovieById, listPublicMovies } from "./catalog-public";
