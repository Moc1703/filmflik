"use client";

import Link from "next/link";
import type { Movie } from "@/lib/movies";
import CatalogHoverPreview from "@/components/CatalogHoverPreview";

function MovieTile({ movie }: { movie: Movie }) {
  return (
    <Link href={`/watch/${movie.id}`} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface mb-3">
        <CatalogHoverPreview
          movieId={movie.id}
          thumbnail={movie.thumbnail}
          alt={movie.title}
          hoverDelayMs={2000}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
          videoClassName="object-cover scale-105"
        />
      </div>
      <h3 className="ff-display text-foreground text-lg font-semibold tracking-tight group-hover:text-brand transition-colors line-clamp-2">
        {movie.title}
      </h3>
      <p className="text-muted text-sm mt-1">
        {movie.year} · {movie.genre}
      </p>
    </Link>
  );
}

export default function MovieGrid({ movies }: { movies: Movie[] }) {
  if (movies.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
      {movies.map((movie) => (
        <li key={movie.id}>
          <MovieTile movie={movie} />
        </li>
      ))}
    </ul>
  );
}
