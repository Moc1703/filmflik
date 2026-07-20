import { NextRequest, NextResponse } from "next/server";
import { resolveUpstreamStreamById } from "@/lib/stream";

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

/**
 * Same-origin media proxy.
 * Browser only sees /api/media/[id] — never the Bunny hostname.
 * Supports HTTP Range for seeking.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const stream = resolveUpstreamStreamById(id);
    if (!stream) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const upstreamHeaders = new Headers();
    for (const name of FORWARD_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) upstreamHeaders.set(name, value);
    }

    const upstream = await fetch(stream.upstreamUrl, {
      headers: upstreamHeaders,
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: "Upstream media unavailable" },
        { status: upstream.status === 403 ? 403 : 502 }
      );
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
      responseHeaders.set("Content-Type", "video/mp4");
    }
    responseHeaders.set("Cache-Control", "private, no-store");
    responseHeaders.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
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
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const stream = resolveUpstreamStreamById(id);
  if (!stream) {
    return new NextResponse(null, { status: 404 });
  }

  const upstream = await fetch(stream.upstreamUrl, {
    method: "HEAD",
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
}
