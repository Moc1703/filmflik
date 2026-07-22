import { NextRequest, NextResponse } from "next/server";
import { isBunnyStorageConfigured } from "@/lib/bunny-storage";
import { signBunnyUrl } from "@/lib/bunny-sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin WebVTT proxy for files under Storage `subtitles/`.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    if (!isBunnyStorageConfigured()) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 503 }
      );
    }

    const { path: parts } = await context.params;
    const file = (parts || []).map(decodeURIComponent).join("/");
    if (!file || file.includes("..") || file.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const storagePath = file.startsWith("subtitles/")
      ? file
      : `subtitles/${file}`;
    const { url } = signBunnyUrl(storagePath, { expiresInSeconds: 86_400 });

    const upstream = await fetch(url, {
      headers: {
        Referer: `${new URL(request.url).origin}/`,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Subtitle unavailable" },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "text/vtt; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("X-Content-Type-Options", "nosniff");
    // Allow <track> on the watch page (same origin already; keep CORS open for safety)
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[subtitles]", error);
    return NextResponse.json(
      { error: "Failed to load subtitle" },
      { status: 500 }
    );
  }
}
