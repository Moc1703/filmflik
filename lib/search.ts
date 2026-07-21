import type { Movie } from "@/lib/movies";

export function filterMovies(movies: Movie[], query: string): Movie[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(q) ||
      movie.genre.toLowerCase().includes(q) ||
      movie.description.toLowerCase().includes(q) ||
      String(movie.year).includes(q)
  );
}

export function searchHref(query: string): string {
  const q = query.trim();
  return q ? `/search?q=${encodeURIComponent(q)}` : "/search";
}
