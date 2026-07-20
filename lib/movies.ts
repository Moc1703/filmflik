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
 * Thumbnails for these samples come from Google's public demo bucket
 * (same set as the video files): storage.googleapis.com/gtv-videos-bucket/sample/images/
 *
 * For your own Bunny films: upload a .jpg/.webp to Bunny (or /public/thumbnails/)
 * and put that URL/path in `thumbnail`.
 */
export const movies: Movie[] = [
  {
    id: "bunny-upload-1",
    title: "Featured Upload",
    description:
      "Featured title from the FILMflik library. Playback is delivered through a protected same-origin stream.",
    // Replace with your own poster on Bunny or /public/thumbnails/
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
    duration: "—",
    genre: "Featured",
    year: 2026,
  },
  {
    id: "sintel",
    title: "Sintel",
    description:
      "A young woman named Sintel searches for her pet dragon, Scales, after it was taken by an adult dragon.",
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    subtitleUrl: "/subtitles/sintel-id.vtt",
    duration: "14:48",
    genre: "Fantasy",
    year: 2010,
  },
  {
    id: "bigbuckbunny",
    title: "Big Buck Bunny",
    description:
      "A large and lovable rabbit deals with three tiny bullies, led by a flying squirrel, who are determined to squelch his happiness.",
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    duration: "9:56",
    genre: "Comedy",
    year: 2008,
  },
  {
    id: "tearsofsteel",
    title: "Tears of Steel",
    description:
      "In a post-apocalyptic future, a group of soldiers and scientists must defend the last remnant of humanity.",
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    duration: "12:14",
    genre: "Sci-Fi",
    year: 2012,
  },
  {
    id: "elephantsdream",
    title: "Elephants Dream",
    description:
      "Two strange characters explore a surreal world inside an enormous machine.",
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    duration: "10:53",
    genre: "Fantasy",
    year: 2006,
  },
];

export function getMovieById(id: string): Movie | undefined {
  return movies.find((movie) => movie.id === id);
}
