import "server-only";

/**
 * Bunny storage paths — SERVER ONLY.
 * Key = movie id from lib/movies.ts
 * Value = file path on Bunny Storage (no domain)
 *
 * Add a matching movie entry in movies.ts with a real thumbnail URL.
 */
const BUNNY_PATHS: Record<string, string> = {
  // Example:
  // "my-film": "films/my-film-1080p.mp4",
};

export function getBunnyPathForMovie(movieId: string): string | undefined {
  return BUNNY_PATHS[movieId];
}

export function listBunnyMovieIds(): string[] {
  return Object.keys(BUNNY_PATHS);
}
