import { NextResponse } from "next/server";
import {
  formatBytes,
  getCatalog,
  isBunnyStorageConfigured,
} from "@/lib/bunny-storage";
import {
  formatStreamDuration,
  getStreamThumbnailUrl,
  isBunnyStreamConfigured,
  listStreamVideos,
} from "@/lib/bunny-stream";
import {
  catalogSourceKey,
  idFromStreamGuid,
  isCatalogReleased,
  type CatalogEntry,
} from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AdminBunnyItem {
  /** Stable draft key: `stream:{guid}` */
  path: string;
  objectName: string;
  length: number;
  sizeLabel: string;
  lastChanged: string | null;
  released: boolean;
  entry: CatalogEntry | null;
  source: "stream";
  suggested: {
    id: string;
    title: string;
    thumbnail?: string;
    duration?: string;
    streamVideoId: string;
  };
}

/** List Bunny Stream library videos + release status. */
export async function GET() {
  const streamOn = isBunnyStreamConfigured();
  const storageOn = isBunnyStorageConfigured();

  if (!streamOn) {
    return NextResponse.json(
      {
        error:
          "Configure Bunny Stream (BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY, BUNNY_STREAM_CDN_URL). Storage is only used for catalog.json + thumbnails.",
        configured: false,
        source: null,
        storageConfigured: storageOn,
        files: [] as AdminBunnyItem[],
      },
      { status: 503 }
    );
  }

  try {
    const catalog = await getCatalog();
    const byKey = new Map(catalog.map((m) => [catalogSourceKey(m), m]));
    const items: AdminBunnyItem[] = [];

    const videos = await listStreamVideos();
    for (const video of videos) {
      const key = `stream:${video.guid}`;
      const entry = byKey.get(key) ?? null;
      items.push({
        path: key,
        objectName: video.title || video.guid,
        length: video.storageSize || 0,
        sizeLabel: formatBytes(video.storageSize || 0),
        lastChanged: video.dateUploaded,
        released: entry ? isCatalogReleased(entry) : false,
        entry,
        source: "stream",
        suggested: {
          id: entry?.id || idFromStreamGuid(video.guid),
          title: entry?.title || video.title || video.guid,
          thumbnail:
            entry?.thumbnail ||
            getStreamThumbnailUrl(video.guid, video.thumbnailFileName),
          duration: entry?.duration || formatStreamDuration(video.length),
          streamVideoId: video.guid,
        },
      });
    }

    for (const entry of catalog) {
      const key = catalogSourceKey(entry);
      if (items.some((i) => i.path === key)) continue;
      items.push({
        path: key,
        objectName: entry.title,
        length: 0,
        sizeLabel: "missing",
        lastChanged: null,
        released: isCatalogReleased(entry),
        entry,
        source: "stream",
        suggested: {
          id: entry.id,
          title: entry.title,
          thumbnail: entry.thumbnail,
          duration: entry.duration,
          streamVideoId: entry.streamVideoId,
        },
      });
    }

    return NextResponse.json({
      configured: true,
      source: "stream",
      storageConfigured: storageOn,
      files: items,
      catalogCount: catalog.length,
    });
  } catch (error) {
    console.error("[admin/bunny]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list Stream videos",
        configured: true,
        files: [],
      },
      { status: 500 }
    );
  }
}
