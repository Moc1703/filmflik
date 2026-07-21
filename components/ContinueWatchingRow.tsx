"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Movie } from "@/lib/movies";
import {
  clearWatchProgress,
  getAllWatchProgress,
  type WatchProgress,
} from "@/lib/player-storage";
import { Play, X } from "lucide-react";
import PosterImage from "@/components/PosterImage";

interface ContinueItem {
  movie: Movie;
  progress: WatchProgress;
}

interface ContinueWatchingRowProps {
  movies: Movie[];
}

const MAX_ITEMS = 8;

export default function ContinueWatchingRow({
  movies,
}: ContinueWatchingRowProps) {
  const [items, setItems] = useState<ContinueItem[]>([]);

  const refresh = () => {
    const entries = getAllWatchProgress();
    const next: ContinueItem[] = [];
    for (const entry of entries) {
      const movie = movies.find((m) => m.id === entry.movieId);
      if (movie) next.push({ movie, progress: entry.progress });
      if (next.length >= MAX_ITEMS) break;
    }
    setItems(next);
  };

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="continue-heading" className="min-w-0">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2
          id="continue-heading"
          className="ff-display text-foreground text-lg md:text-xl font-semibold tracking-tight"
        >
          Continue watching
        </h2>
        <p className="text-muted text-xs tabular-nums shrink-0">
          {items.length} in progress
        </p>
      </div>

      <ul className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:thin]">
        {items.map(({ movie, progress }) => {
          const pct =
            progress.duration > 0
              ? Math.min(100, (progress.time / progress.duration) * 100)
              : 0;
          return (
            <li
              key={movie.id}
              className="group relative w-[9.5rem] sm:w-[11rem] shrink-0 snap-start"
            >
              <Link href={`/watch/${movie.id}`} className="block">
                <div className="relative aspect-video overflow-hidden bg-surface">
                  <PosterImage
                    src={movie.thumbnail}
                    alt=""
                    fill
                    sizes="176px"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="inline-flex h-8 w-8 items-center justify-center bg-brand text-[#1a1208]">
                      <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
                    </span>
                  </span>
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground/20">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-brand transition-colors">
                  {movie.title}
                </p>
              </Link>
              <button
                type="button"
                className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 bg-background/85 hover:bg-background text-foreground p-1 border border-line transition-opacity"
                aria-label={`Remove ${movie.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  clearWatchProgress(movie.id);
                  refresh();
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
