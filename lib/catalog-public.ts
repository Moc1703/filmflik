import "server-only";

import type { Movie } from "@/lib/catalog";
import { isCatalogReleased, toPublicMovie } from "@/lib/catalog";
import { getCatalog, getCatalogEntryById } from "@/lib/bunny-storage";

export async function listPublicMovies(): Promise<Movie[]> {
  const entries = await getCatalog();
  return entries.filter(isCatalogReleased).map(toPublicMovie);
}

export async function getPublicMovieById(
  id: string
): Promise<Movie | undefined> {
  const entry = await getCatalogEntryById(id);
  if (!entry || !isCatalogReleased(entry)) return undefined;
  return toPublicMovie(entry);
}
