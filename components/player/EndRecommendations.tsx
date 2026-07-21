"use client";

import Link from "next/link";
import type { Movie } from "@/lib/movies";
import CatalogHoverPreview from "@/components/CatalogHoverPreview";

interface EndRecommendationsProps {
  movies: Movie[];
}

export default function EndRecommendations({ movies }: EndRecommendationsProps) {
  if (movies.length === 0) return null;

  return (
    <div className="text-left border-t border-line pt-8">
      <p className="ff-display text-foreground text-lg md:text-xl font-semibold tracking-tight mb-5 text-center md:text-left">
        Watch next
      </p>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {movies.map((movie) => (
          <li key={movie.id}>
            <Link
              href={`/watch/${movie.id}`}
              className="group block text-left"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-surface mb-2">
                <CatalogHoverPreview
                  movieId={movie.id}
                  thumbnail={movie.thumbnail}
                  alt={movie.title}
                  hoverDelayMs={500}
                  previewDurationMs={10000}
                  sizes="(max-width: 768px) 45vw, 20vw"
                  className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                  videoClassName="object-cover scale-105"
                />
              </div>
              <p className="ff-display text-foreground text-sm font-semibold tracking-tight line-clamp-2 group-hover:text-brand transition-colors">
                {movie.title}
              </p>
              <p className="text-muted text-xs mt-0.5">
                {movie.year} · {movie.genre}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
