import { NextResponse } from "next/server";
import { listPublicMovies } from "@/lib/catalog-public";
import { attachPlaybackCookie } from "@/lib/playback-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public released catalog (no stream ids / drafts). */
export async function GET() {
  try {
    const movies = await listPublicMovies();
    const res = NextResponse.json(
      { movies },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
    return attachPlaybackCookie(res);
  } catch (error) {
    console.error("[catalog]", error);
    return NextResponse.json(
      { error: "Failed to load catalog", movies: [] },
      { status: 500 }
    );
  }
}
