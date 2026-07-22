"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PosterImage from "@/components/PosterImage";
import { useCatalog } from "@/lib/use-catalog";
import { formatProgressTime } from "@/lib/player-storage";
import { deleteServerProgress } from "@/lib/progress-sync";
import type { Movie } from "@/lib/movies";

type HistoryItem = {
  movie: Movie;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: string;
  completed: boolean;
};

export default function HistoryPage() {
  const { movies, loading: catalogLoading } = useCatalog();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me/progress?includeCompleted=1", {
        cache: "no-store",
      });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/history")}`;
        return;
      }
      if (!res.ok) throw new Error("Could not load history");

      // Also fetch completed via a wider query — GET only returns in-progress.
      // For history page we want all recent; call with a dedicated approach:
      // Re-fetch raw by using progress list + include completed from second request.
      const data = (await res.json()) as {
        items?: Array<{
          movieId: string;
          positionSeconds: number;
          durationSeconds: number;
          updatedAt: string;
          completed: boolean;
        }>;
      };

      const next: HistoryItem[] = [];
      for (const entry of data.items || []) {
        const movie = movies.find((m) => m.id === entry.movieId);
        if (!movie) continue;
        next.push({
          movie,
          positionSeconds: entry.positionSeconds,
          durationSeconds: entry.durationSeconds,
          updatedAt: entry.updatedAt,
          completed: entry.completed,
        });
      }
      setItems(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [movies]);

  useEffect(() => {
    if (catalogLoading) return;
    void refresh();
  }, [catalogLoading, refresh]);

  return (
    <main className="ff-atmosphere min-h-screen">
      <Navbar movies={movies} />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16 pt-28 pb-16">
        <h1 className="ff-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">
          History
        </h1>
        <p className="text-muted text-sm mb-10">
          Continue where you left off.
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

        {!loading && !catalogLoading && !error && items.length === 0 && (
          <div className="py-16">
            <p className="text-muted text-sm mb-4">No watch history yet.</p>
            <Link href="/" className="text-brand hover:text-[#efb56f] text-sm font-medium">
              Browse films →
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <ul className="divide-y divide-line">
            {items.map((item) => {
              const pct =
                item.durationSeconds > 0
                  ? Math.min(
                      100,
                      (item.positionSeconds / item.durationSeconds) * 100
                    )
                  : 0;
              return (
                <li
                  key={item.movie.id}
                  className="group flex items-center gap-4 py-4"
                >
                  <Link
                    href={`/watch/${item.movie.id}`}
                    className="relative w-28 sm:w-36 aspect-video overflow-hidden bg-surface shrink-0"
                  >
                    <PosterImage
                      src={item.movie.thumbnail}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="144px"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-brand" fill="currentColor" />
                    </span>
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground/20">
                      <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/watch/${item.movie.id}`}
                      className="ff-display font-semibold tracking-tight text-foreground hover:text-brand transition-colors truncate block"
                    >
                      {item.movie.title}
                    </Link>
                    <p className="text-muted text-sm mt-1 tabular-nums">
                      {formatProgressTime(item.positionSeconds)}
                      {item.durationSeconds > 0 && (
                        <> / {formatProgressTime(item.durationSeconds)}</>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ff-icon-btn shrink-0"
                    aria-label={`Remove ${item.movie.title}`}
                    onClick={() => {
                      void deleteServerProgress(item.movie.id).then(() =>
                        refresh()
                      );
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Footer />
    </main>
  );
}
