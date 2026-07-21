import type { Movie } from "@/lib/movies";

const RECENT_LIMIT = 12;

/** Newest first. Entries without addedAt sort last. */
export function sortByRecentlyAdded<T extends { addedAt?: number }>(
  movies: T[]
): T[] {
  return [...movies].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

export function recentlyAddedMovies(
  movies: Movie[],
  limit = RECENT_LIMIT
): Movie[] {
  return sortByRecentlyAdded(movies).slice(0, limit);
}

/** Same genre first, then other titles. Excludes the current movie. */
export function pickRecommendations(
  current: Pick<Movie, "id" | "genre">,
  all: Movie[],
  limit = 4
): Movie[] {
  const others = all.filter((m) => m.id !== current.id);
  const genre = current.genre.trim().toLowerCase();
  const same = others.filter(
    (m) => m.genre.trim().toLowerCase() === genre
  );
  const rest = others.filter(
    (m) => m.genre.trim().toLowerCase() !== genre
  );
  return [
    ...sortByRecentlyAdded(same),
    ...sortByRecentlyAdded(rest),
  ].slice(0, limit);
}
