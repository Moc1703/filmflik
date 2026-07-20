import { NextResponse } from "next/server";
import { getMovieById } from "@/lib/movies";
import { getPlaybackPath, resolveUpstreamStreamById } from "@/lib/stream";

export const runtime = "nodejs";

/**
 * Issues a same-origin playback path for the player.
 * Never returns Bunny / CDN hostnames to the client.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const movie = getMovieById(id);
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // Validate upstream exists / is resolvable
    const upstream = resolveUpstreamStreamById(id);
    if (!upstream) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        url: getPlaybackPath(id),
        expiresAt: upstream.expiresAt,
        protected: upstream.kind === "protected",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[stream]", error);
    return NextResponse.json(
      { error: "Failed to resolve stream" },
      { status: 500 }
    );
  }
}
