export interface Movie {
  id: string;
  title: string;
  description: string;
  /** Poster/thumbnail image URL (CDN, Bunny, or /public path). */
  thumbnail: string;
  /**
   * External absolute video URL (public samples only).
   * Protected library files are mapped in lib/media.server.ts → /api/media/[id].
   */
  videoUrl?: string;
  subtitleUrl?: string;
  duration: string;
  genre: string;
  year: number;
}

/**
 * Catalog entries. Bunny files are mapped in lib/media.server.ts.
 * Replace `thumbnail` with your own poster (Bunny URL or /public/thumbnails/...).
 */
export const movies: Movie[] = [
  {
    id: "bunny-upload-1",
    title: "Featured Upload",
    description:
      "Featured title from the FILMflik library. Playback is delivered through a protected same-origin stream.",
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
    duration: "—",
    genre: "Featured",
    year: 2026,
  },
];

export function getMovieById(id: string): Movie | undefined {
  return movies.find((movie) => movie.id === id);
}
