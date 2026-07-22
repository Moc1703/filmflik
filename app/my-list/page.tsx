"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieGrid from "@/components/MovieGrid";
import { useCatalog } from "@/lib/use-catalog";
import type { Movie } from "@/lib/movies";

export default function MyListPage() {
  const { movies, loading: catalogLoading } = useCatalog();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/me/watchlist", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent("/my-list")}`;
          return;
        }
        if (!res.ok) {
          throw new Error("Could not load your list");
        }
        const data = (await res.json()) as {
          items?: Array<{ movieId: string }>;
        };
        if (!cancelled) {
          setIds((data.items || []).map((i) => i.movieId));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const listMovies: Movie[] = useMemo(() => {
    const map = new Map(movies.map((m) => [m.id, m]));
    return ids.map((id) => map.get(id)).filter(Boolean) as Movie[];
  }, [ids, movies]);

  return (
    <main className="ff-atmosphere min-h-screen">
      <Navbar movies={movies} />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16 pt-28 pb-16">
        <h1 className="ff-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">
          My List
        </h1>
        <p className="text-muted text-sm mb-10">
          Titles you saved to watch later.
        </p>

        {(loading || catalogLoading) && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-brand" />
          </div>
        )}

        {error && (
          <p className="text-[#e07a6a] text-sm border border-[#e07a6a]/30 bg-[#e07a6a]/10 px-3 py-2 max-w-md">
            {error}
          </p>
        )}

        {!loading && !catalogLoading && !error && listMovies.length === 0 && (
          <div className="py-16">
            <p className="text-muted text-sm mb-4">Your list is empty.</p>
            <Link href="/" className="text-brand hover:text-[#efb56f] text-sm font-medium">
              Browse films →
            </Link>
          </div>
        )}

        {!loading && !catalogLoading && listMovies.length > 0 && (
          <MovieGrid movies={listMovies} />
        )}
      </div>
      <Footer />
    </main>
  );
}
