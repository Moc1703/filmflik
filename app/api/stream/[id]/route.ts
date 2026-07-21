import { NextResponse } from "next/server";
import {
  getPublicMovieById,
  getPlaybackPath,
  resolveUpstreamStreamById,
} from "@/lib/stream";
import { isStreamTokenConfigured } from "@/lib/bunny-sign";
import { attachPlaybackCookie } from "@/lib/playback-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues a same-origin playback path for the player.
 * Never returns Bunny / CDN hostnames to the client.
 * Also refreshes the httpOnly playback session cookie.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const movie = await getPublicMovieById(id);
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const upstream = await resolveUpstreamStreamById(id);
    if (!upstream) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const res = NextResponse.json(
      {
        url: getPlaybackPath(id),
        format: upstream.format,
        expiresAt: upstream.expiresAt,
        protected: upstream.kind === "protected",
        streamTokenAuth: isStreamTokenConfigured(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
    return attachPlaybackCookie(res);
  } catch (error) {
    console.error("[stream]", error);
    return NextResponse.json(
      { error: "Failed to resolve stream" },
      { status: 500 }
    );
  }
}
