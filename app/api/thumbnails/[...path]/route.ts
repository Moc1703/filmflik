import { NextRequest, NextResponse } from "next/server";
import { isBunnyStorageConfigured } from "@/lib/bunny-storage";
import { signBunnyUrl } from "@/lib/bunny-sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin thumbnail proxy for files under Storage `thumbnails/`.
 * Signs the Storage CDN URL so Token Authentication does not block posters.
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

    const storagePath = file.startsWith("thumbnails/")
      ? file
      : `thumbnails/${file}`;
    const { url } = signBunnyUrl(storagePath, { expiresInSeconds: 86_400 });

    const upstream = await fetch(url, {
      headers: {
        Referer: `${new URL(request.url).origin}/`,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Thumbnail unavailable" },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[thumbnails]", error);
    return NextResponse.json(
      { error: "Failed to load thumbnail" },
      { status: 500 }
    );
  }
}
