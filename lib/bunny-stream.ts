import "server-only";

import { createHash } from "crypto";

export interface StreamVideo {
  guid: string;
  title: string;
  length: number;
  storageSize: number;
  thumbnailFileName: string | null;
  dateUploaded: string | null;
  status: number;
  encodeProgress: number;
}

interface StreamListResponse {
  totalItems?: number;
  currentPage?: number;
  itemsPerPage?: number;
  items?: Array<{
    guid?: string;
    title?: string;
    length?: number;
    storageSize?: number;
    thumbnailFileName?: string | null;
    dateUploaded?: string | null;
    status?: number;
    encodeProgress?: number;
  }>;
}

export function isBunnyStreamConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STREAM_LIBRARY_ID?.trim() &&
      process.env.BUNNY_STREAM_API_KEY?.trim() &&
      process.env.BUNNY_STREAM_CDN_URL?.trim()
  );
}

function getStreamConfig() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  const cdnRaw = process.env.BUNNY_STREAM_CDN_URL?.trim();
  if (!libraryId || !apiKey || !cdnRaw) {
    throw new Error(
      "Bunny Stream is not configured. Set BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY, and BUNNY_STREAM_CDN_URL."
    );
  }
  const withProtocol = /^https?:\/\//i.test(cdnRaw)
    ? cdnRaw
    : `https://${cdnRaw}`;
  const cdnBase = withProtocol.replace(/\/$/, "");
  return { libraryId, apiKey, cdnBase };
}

export function getStreamCdnBase(): string {
  return getStreamConfig().cdnBase;
}

export function getStreamPlaylistPath(videoId: string): string {
  return `/${videoId.replace(/^\//, "")}/playlist.m3u8`;
}

export function getStreamAssetPath(videoId: string, relativePath: string): string {
  const cleanVideo = videoId.replace(/^\//, "").replace(/\/$/, "");
  const cleanRel = relativePath.replace(/^\//, "");
  return `/${cleanVideo}/${cleanRel}`;
}

export function getStreamThumbnailUrl(
  videoId: string,
  thumbnailFileName?: string | null
): string {
  const file = thumbnailFileName || "thumbnail.jpg";
  return `${getStreamCdnBase()}/${videoId.replace(/^\//, "")}/${file}`;
}

export async function listStreamVideos(): Promise<StreamVideo[]> {
  const { libraryId, apiKey } = getStreamConfig();
  const items: StreamVideo[] = [];
  let page = 1;
  const itemsPerPage = 100;

  for (;;) {
    const url = new URL(
      `https://video.bunnycdn.com/library/${libraryId}/videos`
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("itemsPerPage", String(itemsPerPage));
    url.searchParams.set("orderBy", "date");

    const res = await fetch(url, {
      headers: { AccessKey: apiKey, Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to list Stream videos (${res.status}): ${text || res.statusText}`
      );
    }

    const data = (await res.json()) as StreamListResponse;
    const batch = Array.isArray(data.items) ? data.items : [];
    for (const item of batch) {
      if (!item.guid) continue;
      items.push({
        guid: item.guid,
        title: item.title || item.guid,
        length: typeof item.length === "number" ? item.length : 0,
        storageSize: typeof item.storageSize === "number" ? item.storageSize : 0,
        thumbnailFileName: item.thumbnailFileName ?? null,
        dateUploaded: item.dateUploaded ?? null,
        status: typeof item.status === "number" ? item.status : 0,
        encodeProgress:
          typeof item.encodeProgress === "number" ? item.encodeProgress : 0,
      });
    }

    if (batch.length < itemsPerPage) break;
    page += 1;
    if (page > 50) break;
  }

  return items;
}

export function formatStreamDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Create an empty Stream video object (required before TUS upload). */
export async function createStreamVideo(title: string): Promise<{
  videoId: string;
  libraryId: string;
}> {
  const { libraryId, apiKey } = getStreamConfig();
  const cleanTitle = title.trim() || "Untitled upload";

  const res = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos`,
    {
      method: "POST",
      headers: {
        AccessKey: apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: cleanTitle }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to create Stream video (${res.status}): ${text || res.statusText}`
    );
  }

  const data = (await res.json()) as { guid?: string };
  if (!data.guid) {
    throw new Error("Stream create video response missing guid");
  }
  return { videoId: data.guid, libraryId };
}

/**
 * Presigned TUS credentials for direct browser → Bunny upload.
 * Signature = SHA256(libraryId + apiKey + expirationTime + videoId)
 */
export function createTusUploadAuth(videoId: string, ttlSeconds = 6 * 60 * 60): {
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
  endpoint: string;
} {
  const { libraryId, apiKey } = getStreamConfig();
  const authorizationExpire =
    Math.floor(Date.now() / 1000) + Math.max(300, ttlSeconds);
  const authorizationSignature = createHash("sha256")
    .update(`${libraryId}${apiKey}${authorizationExpire}${videoId}`)
    .digest("hex");

  return {
    libraryId,
    videoId,
    authorizationSignature,
    authorizationExpire,
    endpoint: "https://video.bunnycdn.com/tusupload",
  };
}
