import { NextRequest, NextResponse } from "next/server";
import { getCatalogEntryById } from "@/lib/bunny-storage";
import { getStreamCdnBase } from "@/lib/bunny-stream";
import { signBunnyDirectoryUrl, signStreamAssetUrl } from "@/lib/bunny-sign";
import { assertPlaybackAccess } from "@/lib/playback-auth";
import {
  getPlaybackPath,
  resolveUpstreamAsset,
  resolveUpstreamStreamById,
} from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARD_REQUEST_HEADERS = ["range", "if-range"] as const;

const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
  "cache-control",
] as const;

function normalizeCdnBase(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Rewrite HLS playlists so variants/segments hit Bunny CDN directly
 * (avoids proxying every .ts through Next.js — main cause of Stream buffering).
 */
function rewriteM3u8ToCdn(body: string, streamVideoId: string): string {
  const cdnBase = normalizeCdnBase(getStreamCdnBase());
  const tokenPath = `/${streamVideoId}/`;

  const toCdnUrl = (ref: string): string => {
    let assetPath: string;
    if (/^https?:\/\//i.test(ref)) {
      try {
        const url = new URL(ref);
        const parts = url.pathname.split("/").filter(Boolean);
        const rest = parts.slice(1).join("/");
        if (!rest) return ref;
        assetPath = `/${streamVideoId}/${rest}`;
      } catch {
        return ref;
      }
    } else {
      assetPath = `/${streamVideoId}/${ref.replace(/^\.\//, "")}`;
    }

    const streamToken = process.env.BUNNY_STREAM_TOKEN_KEY?.trim();
    if (streamToken) {
      const expiresIn = Number(
        process.env.BUNNY_STREAM_TOKEN_TTL ||
          process.env.BUNNY_TOKEN_TTL ||
          900
      );
      return signBunnyDirectoryUrl(assetPath, tokenPath, {
        cdnBase,
        tokenKey: streamToken,
        expiresInSeconds: expiresIn,
      }).url;
    }
    return `${cdnBase}${assetPath}`;
  };

  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        // Rewrite URI="..." attributes (EXT-X-MAP, EXT-X-MEDIA, EXT-X-KEY, etc.)
        return line.replace(/URI="([^"]+)"/gi, (_m, uri: string) => {
          if (uri.startsWith("#")) return `URI="${uri}"`;
          return `URI="${toCdnUrl(uri)}"`;
        });
      }

      return toCdnUrl(trimmed);
    })
    .join("\n");
}

function streamUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Bunny Stream often enables "Block Direct URL File Access" + Allowed Domains.
  // Server-side fetches have no browser Referer — forward the app origin or Bunny 403s.
  const referer =
    request.headers.get("referer") ||
    request.headers.get("origin") ||
    `${new URL(request.url).origin}/`;
  headers.set("Referer", referer);
  const origin =
    request.headers.get("origin") || new URL(request.url).origin;
  headers.set("Origin", origin);

  return headers;
}

async function proxyUpstream(
  request: NextRequest,
  upstreamUrl: string,
  opts?: { rewritePlaylistForStreamId?: string }
) {
  const upstream = await fetch(upstreamUrl, {
    headers: streamUpstreamHeaders(request),
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    if (upstream.status === 403) {
      const hasStreamToken = Boolean(
        process.env.BUNNY_STREAM_TOKEN_KEY?.trim()
      );
      return NextResponse.json(
        {
          error: hasStreamToken
            ? "Stream CDN rejected the signed URL. BUNNY_STREAM_TOKEN_KEY is not the Stream API key — leave it empty unless Token Authentication is enabled, or paste the separate Security token key."
            : "Stream CDN returned 403. Usually Allowed Domains / Block Direct URL File Access — add your site (e.g. localhost) under Stream → Security → Domains, or disable Block Direct URL File Access.",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Upstream media unavailable" },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") || "";
  const isPlaylist =
    opts?.rewritePlaylistForStreamId &&
    (contentType.includes("mpegurl") ||
      contentType.includes("m3u8") ||
      upstreamUrl.includes(".m3u8"));

  if (isPlaylist && opts?.rewritePlaylistForStreamId) {
    const text = await upstream.text();
    const rewritten = rewriteM3u8ToCdn(text, opts.rewritePlaylistForStreamId);
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        // Short cache OK — playlist is tiny; segments load from CDN
        "Cache-Control": "private, max-age=5",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (!responseHeaders.has("accept-ranges")) {
    responseHeaders.set("Accept-Ranges", "bytes");
  }
  if (!responseHeaders.has("content-type")) {
    responseHeaders.set(
      "Content-Type",
      upstreamUrl.includes(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/mp4"
    );
  }
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

/**
 * Same-origin media proxy (Bunny Stream HLS only).
 * Master playlist is proxied & rewritten to CDN; segments hit Stream CDN directly.
 * Stream preview assets (preview.webp / play_*p.mp4) are proxied when needed.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; path?: string[] }> }
) {
  const denied = assertPlaybackAccess(request);
  if (denied) return denied;

  const { id, path: pathParts } = await context.params;
  const subpath = (pathParts || []).map(decodeURIComponent).join("/");

  try {
    if (!subpath) {
      return NextResponse.redirect(
        new URL(getPlaybackPath(id), request.url),
        302
      );
    }

    if (subpath === "playlist.m3u8") {
      const stream = await resolveUpstreamStreamById(id);
      if (!stream?.streamVideoId) {
        return NextResponse.json(
          { error: "HLS playlist not available" },
          { status: 404 }
        );
      }
      return proxyUpstream(request, stream.upstreamUrl, {
        rewritePlaylistForStreamId: stream.streamVideoId,
      });
    }

    // Hover / billboard previews (lightweight Stream assets)
    if (subpath === "preview.mp4" || subpath === "preview.webp") {
      const entry = await getCatalogEntryById(id);
      if (!entry?.streamVideoId) {
        return NextResponse.json({ error: "Preview not available" }, { status: 404 });
      }
      const file =
        subpath === "preview.webp" ? "preview.webp" : "play_240p.mp4";
      const asset = await resolveUpstreamAsset(entry, file);
      if (!asset) {
        return NextResponse.json({ error: "Preview not available" }, { status: 404 });
      }
      return proxyUpstream(request, asset.upstreamUrl);
    }

    // Stream rendition / segment fallback (rare after CDN rewrite)
    if (subpath.endsWith(".m3u8") || /\.ts$/i.test(subpath) || /play_\d+p\.mp4$/i.test(subpath)) {
      const entry = await getCatalogEntryById(id);
      if (!entry?.streamVideoId) {
        return NextResponse.json({ error: "Movie not found" }, { status: 404 });
      }
      const asset = await resolveUpstreamAsset(entry, subpath);
      if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      return proxyUpstream(request, asset.upstreamUrl, {
        rewritePlaylistForStreamId: subpath.endsWith(".m3u8")
          ? entry.streamVideoId
          : undefined,
      });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("[media-proxy]", error);
    return NextResponse.json(
      { error: "Failed to load media" },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ id: string; path?: string[] }> }
) {
  const denied = assertPlaybackAccess(request);
  if (denied) return denied;

  const { id, path: pathParts } = await context.params;
  const subpath = (pathParts || []).map(decodeURIComponent).join("/");

  try {
    let upstreamUrl: string | null = null;
    if (!subpath || subpath === "playlist.m3u8") {
      const stream = await resolveUpstreamStreamById(id);
      upstreamUrl = stream?.upstreamUrl ?? null;
    } else {
      const entry = await getCatalogEntryById(id);
      if (entry) {
        const asset = await resolveUpstreamAsset(entry, subpath);
        upstreamUrl = asset?.upstreamUrl ?? null;
      }
    }
    if (!upstreamUrl) {
      return new NextResponse(null, { status: 404 });
    }

    const upstream = await fetch(upstreamUrl, {
      method: "HEAD",
      headers: streamUpstreamHeaders(request),
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    for (const name of FORWARD_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("Cache-Control", "private, no-store");
    return new NextResponse(null, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
