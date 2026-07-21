import type { Movie } from "@/lib/catalog";

export type { Movie } from "@/lib/catalog";

/**
 * Client-safe movie helpers.
 * Source of truth is Bunny `catalog.json` via /api/catalog (or server getCatalog).
 */

export function findMovieById(
  movies: Movie[],
  id: string
): Movie | undefined {
  return movies.find((movie) => movie.id === id);
}
