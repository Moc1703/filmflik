import "server-only";

/**
 * Bunny storage paths — SERVER ONLY.
 * Key = movie id from lib/movies.ts
 * Value = file path on Bunny Storage (no domain)
 */
const BUNNY_PATHS: Record<string, string> = {
  "bunny-upload-1":
    "YTDown.com_YouTube_Media_yz2Vd4FzMMk_001_1080p.mp4",
};

export function getBunnyPathForMovie(movieId: string): string | undefined {
  return BUNNY_PATHS[movieId];
}

export function listBunnyMovieIds(): string[] {
  return Object.keys(BUNNY_PATHS);
}
