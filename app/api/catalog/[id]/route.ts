import { NextResponse } from "next/server";
import { getPublicMovieById } from "@/lib/catalog-public";
import { attachPlaybackCookie } from "@/lib/playback-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const res = NextResponse.json(
      { movie },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
    return attachPlaybackCookie(res);
  } catch (error) {
    console.error("[catalog/id]", error);
    return NextResponse.json(
      { error: "Failed to load movie" },
      { status: 500 }
    );
  }
}
