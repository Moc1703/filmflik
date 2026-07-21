import type { Movie } from "@/lib/movies";

/** Suggested labels for admin — free text still allowed. */
export const CATEGORY_PRESETS = [
  "Featured",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Documentary",
  "Drama",
  "Horror",
  "Music",
  "Romance",
  "Sci-Fi",
  "Thriller",
] as const;

export function normalizeCategory(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** URL slug for a category label, e.g. "Sci-Fi" → "sci-fi". */
export function categoryToSlug(value: string): string {
  return normalizeCategory(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryHref(name: string): string {
  return `/category/${categoryToSlug(name)}`;
}

/** Resolve a URL slug against live catalog genres (case-insensitive). */
export function findCategoryBySlug(
  movies: Pick<Movie, "genre">[],
  slug: string
): string | null {
  const target = categoryToSlug(slug);
  if (!target) return null;
  for (const name of listCategories(movies)) {
    if (categoryToSlug(name) === target) return name;
  }
  return null;
}

/** Unique categories from the catalog, Featured first, then A–Z. */
export function listCategories(movies: Pick<Movie, "genre">[]): string[] {
  const set = new Set<string>();
  for (const movie of movies) {
    const name = normalizeCategory(movie.genre || "");
    if (name) set.add(name);
  }
  const all = [...set];
  all.sort((a, b) => {
    if (a === "Featured") return -1;
    if (b === "Featured") return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
  return all;
}

export function moviesInCategory(
  movies: Movie[],
  category: string | "all"
): Movie[] {
  if (category === "all") return movies;
  const target = normalizeCategory(category).toLowerCase();
  return movies.filter(
    (m) => normalizeCategory(m.genre).toLowerCase() === target
  );
}

export function groupMoviesByCategory(
  movies: Movie[]
): { category: string; movies: Movie[] }[] {
  const order = listCategories(movies);
  return order.map((category) => ({
    category,
    movies: moviesInCategory(movies, category),
  }));
}
