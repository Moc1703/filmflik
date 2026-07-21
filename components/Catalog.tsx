"use client";

import { useMemo } from "react";
import type { Movie } from "@/lib/movies";
import MovieGrid from "@/components/MovieGrid";
import { recentlyAddedMovies } from "@/lib/recommendations";

interface CatalogProps {
  movies: Movie[];
  id?: string;
}

/** Homepage — titles sorted by catalog addedAt (newest first). */
export default function Catalog({
  movies,
  id = "recently-added",
}: CatalogProps) {
  const recent = useMemo(() => recentlyAddedMovies(movies), [movies]);

  if (recent.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-28">
      <header className="mb-8 md:mb-10">
        <h2 className="ff-display text-foreground text-2xl md:text-3xl font-semibold tracking-tight">
          Recently added
        </h2>
        <p className="text-muted text-sm md:text-base mt-2 max-w-lg leading-relaxed">
          Fresh titles in the library. Open one when you&apos;re ready to watch.
        </p>
      </header>
      <MovieGrid movies={recent} />
    </section>
  );
}
