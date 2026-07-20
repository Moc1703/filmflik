"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { movies, type Movie } from "@/lib/movies";
import {
  clearWatchProgress,
  formatProgressTime,
  getAllWatchProgress,
  type WatchProgress,
} from "@/lib/player-storage";
import { Play, X } from "lucide-react";

interface ContinueItem {
  movie: Movie;
  progress: WatchProgress;
}

export default function ContinueWatchingRow() {
  const [items, setItems] = useState<ContinueItem[]>([]);

  const refresh = () => {
    const entries = getAllWatchProgress();
    const next: ContinueItem[] = [];
    for (const entry of entries) {
      const movie = movies.find((m) => m.id === entry.movieId);
      if (movie) next.push({ movie, progress: entry.progress });
    }
    setItems(next);
  };

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mb-8 md:mb-10 px-4 md:px-12 lg:px-16">
      <h2 className="text-white text-lg md:text-2xl font-semibold tracking-tight mb-3 md:mb-4">
        Continue Watching
      </h2>
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ movie, progress }) => {
          const pct =
            progress.duration > 0
              ? Math.min(100, (progress.time / progress.duration) * 100)
              : 0;
          return (
            <div
              key={movie.id}
              className="relative group shrink-0 w-[42vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] max-w-[280px] snap-start"
            >
              <Link
                href={`/watch/${movie.id}`}
                className="block relative aspect-video rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-white/5 hover:ring-brand/40 transition"
              >
                <Image
                  src={movie.thumbnail}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 42vw, 22vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shrink-0">
                      <Play className="w-3 h-3 ml-0.5" fill="currentColor" />
                    </span>
                    <h3 className="text-white text-sm font-semibold truncate">
                      {movie.title}
                    </h3>
                  </div>
                  <p className="text-white/50 text-xs tabular-nums mb-2">
                    {formatProgressTime(progress.time)}
                    {progress.duration > 0 && (
                      <span> / {formatProgressTime(progress.duration)}</span>
                    )}
                  </p>
                  <div className="h-1 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
              <button
                type="button"
                className="absolute top-2 right-2 z-10 rounded-full bg-black/70 hover:bg-black text-white p-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition border border-white/10"
                aria-label={`Remove ${movie.title} from continue watching`}
                onClick={(e) => {
                  e.preventDefault();
                  clearWatchProgress(movie.id);
                  refresh();
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
