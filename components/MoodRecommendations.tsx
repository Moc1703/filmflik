"use client";

import { useMemo, useState } from "react";
import type { Movie } from "@/lib/movies";
import { MOODS, moviesForMood, type MoodId } from "@/lib/moods";
import MovieGrid from "@/components/MovieGrid";

interface MoodRecommendationsProps {
  movies: Movie[];
}

export default function MoodRecommendations({
  movies,
}: MoodRecommendationsProps) {
  const [moodId, setMoodId] = useState<MoodId | null>(null);

  const mood = useMemo(
    () => MOODS.find((m) => m.id === moodId) ?? null,
    [moodId]
  );

  const picks = useMemo(() => {
    if (!mood) return [];
    return moviesForMood(movies, mood);
  }, [movies, mood]);

  if (movies.length === 0) return null;

  return (
    <section aria-labelledby="mood-heading" className="min-w-0">
      <header className="mb-6 md:mb-8">
        <h2
          id="mood-heading"
          className="ff-display text-foreground text-2xl md:text-3xl font-semibold tracking-tight"
        >
          For your mood
        </h2>
        <p className="text-muted text-sm md:text-base mt-2 max-w-lg leading-relaxed">
          Pick how you feel — we&apos;ll pull titles that match.
        </p>
      </header>

      <div
        className="flex flex-wrap gap-x-1 gap-y-2 border-b border-line pb-1"
        role="tablist"
        aria-label="Moods"
      >
        {MOODS.map((m) => {
          const active = moodId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMoodId(active ? null : m.id)}
              className={`relative px-3 py-2.5 text-sm font-semibold tracking-tight transition-colors ${
                active
                  ? "text-brand"
                  : "text-foreground/55 hover:text-foreground"
              }`}
            >
              {m.label}
              {active && (
                <span
                  className="absolute inset-x-2 -bottom-px h-0.5 bg-brand"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {mood && (
        <div className="mt-8 ff-fade-in">
          <p className="text-muted text-sm mb-6 max-w-md leading-relaxed">
            {mood.blurb}
            {picks.length > 0 && (
              <span className="text-foreground/50">
                {" "}
                · {picks.length} title{picks.length === 1 ? "" : "s"}
              </span>
            )}
          </p>

          {picks.length > 0 ? (
            <MovieGrid movies={picks} />
          ) : (
            <p className="text-muted text-sm py-8">
              Nothing in the library fits this mood yet. Try another, or browse
              recently added below.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
