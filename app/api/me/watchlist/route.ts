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
    return NextResponse.json({ items: [], inList: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const movieId = request.nextUrl.searchParams.get("movieId");

  if (movieId) {
    const { data, error } = await supabase
      .from("watchlist")
      .select("movie_id")
      .eq("user_id", user.id)
      .eq("movie_id", movieId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ inList: Boolean(data) });
  }

  const { data, error } = await supabase
    .from("watchlist")
    .select("movie_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: (data || []).map((row) => ({
      movieId: row.movie_id,
      createdAt: row.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as { movieId?: string };
  const movieId = body.movieId?.trim();
  if (!movieId) {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }

  const { error } = await supabase.from("watchlist").upsert(
    {
      user_id: user.id,
      movie_id: movieId,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,movie_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inList: true });
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

  const movieId =
    request.nextUrl.searchParams.get("movieId") ||
    ((await request.json().catch(() => null)) as { movieId?: string } | null)
      ?.movieId;

  if (!movieId?.trim()) {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("movie_id", movieId.trim());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inList: false });
}
