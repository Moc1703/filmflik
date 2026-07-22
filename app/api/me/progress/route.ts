import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Sign in required" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], progress: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const movieId = request.nextUrl.searchParams.get("movieId");

  if (movieId) {
    const { data, error } = await supabase
      .from("watch_progress")
      .select(
        "movie_id, position_seconds, duration_seconds, completed, updated_at"
      )
      .eq("user_id", user.id)
      .eq("movie_id", movieId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ progress: null });
    }

    return NextResponse.json({
      progress: {
        movieId: data.movie_id,
        positionSeconds: Number(data.position_seconds),
        durationSeconds: Number(data.duration_seconds),
        completed: data.completed,
        updatedAt: data.updated_at,
      },
    });
  }

  const includeCompleted =
    request.nextUrl.searchParams.get("includeCompleted") === "1";

  let query = supabase
    .from("watch_progress")
    .select(
      "movie_id, position_seconds, duration_seconds, completed, updated_at"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(48);

  if (!includeCompleted) {
    query = query.eq("completed", false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || [])
    .filter((row) => {
      if (row.completed && includeCompleted) return true;
      const pos = Number(row.position_seconds);
      const dur = Number(row.duration_seconds);
      if (pos < 5) return false;
      return !(dur > 0 && pos / dur > 0.95);
    })
    .map((row) => ({
      movieId: row.movie_id,
      positionSeconds: Number(row.position_seconds),
      durationSeconds: Number(row.duration_seconds),
      completed: row.completed,
      updatedAt: row.updated_at,
    }));

  return NextResponse.json({ items });
}

export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as {
    movieId?: string;
    positionSeconds?: number;
    durationSeconds?: number;
    completed?: boolean;
  };

  const movieId = body.movieId?.trim();
  if (!movieId) {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }

  const positionSeconds = Number(body.positionSeconds) || 0;
  const durationSeconds = Number(body.durationSeconds) || 0;
  const completed = Boolean(body.completed);

  const { error } = await supabase.from("watch_progress").upsert(
    {
      user_id: user.id,
      movie_id: movieId,
      position_seconds: completed ? 0 : positionSeconds,
      duration_seconds: durationSeconds,
      completed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,movie_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const movieId = request.nextUrl.searchParams.get("movieId");
  if (!movieId) {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("watch_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("movie_id", movieId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
