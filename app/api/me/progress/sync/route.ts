import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncItem = {
  movieId: string;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt?: number;
};

/** Merge localStorage progress into server (keeps newer updated_at). */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json()) as { items?: SyncItem[] };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  let synced = 0;
  for (const item of items.slice(0, 50)) {
    const movieId = item.movieId?.trim();
    if (!movieId) continue;
    const positionSeconds = Number(item.positionSeconds) || 0;
    const durationSeconds = Number(item.durationSeconds) || 0;
    if (positionSeconds < 5) continue;

    const completed =
      durationSeconds > 0 && positionSeconds / durationSeconds > 0.95;
    const localUpdated = item.updatedAt
      ? new Date(item.updatedAt).toISOString()
      : new Date().toISOString();

    const { data: existing } = await supabase
      .from("watch_progress")
      .select("updated_at")
      .eq("user_id", user.id)
      .eq("movie_id", movieId)
      .maybeSingle();

    if (
      existing?.updated_at &&
      new Date(existing.updated_at).getTime() >= new Date(localUpdated).getTime()
    ) {
      continue;
    }

    const { error } = await supabase.from("watch_progress").upsert(
      {
        user_id: user.id,
        movie_id: movieId,
        position_seconds: completed ? 0 : positionSeconds,
        duration_seconds: durationSeconds,
        completed,
        updated_at: localUpdated,
      },
      { onConflict: "user_id,movie_id" }
    );
    if (!error) synced += 1;
  }

  return NextResponse.json({ ok: true, synced });
}
