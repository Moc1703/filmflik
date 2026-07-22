import type { Movie } from "@/lib/movies";
import { normalizeCategory } from "@/lib/categories";
import { sortByRecentlyAdded } from "@/lib/recommendations";

export type MoodId =
  | "chill"
  | "laugh"
  | "thrill"
  | "escape"
  | "feel"
  | "amped";

export interface Mood {
  id: MoodId;
  label: string;
  blurb: string;
  /** Genres that fit this mood (matched case-insensitively). */
  genres: string[];
}

export const MOODS: Mood[] = [
  {
    id: "chill",
    label: "Chill",
    blurb: "Slow burn, soft nights, nothing that shouts.",
    genres: ["Drama", "Documentary", "Romance", "Music", "Biography"],
  },
  {
    id: "laugh",
    label: "Laugh",
    blurb: "Light, witty, or straight-up silly.",
    genres: ["Comedy", "Animation", "Family", "Musical"],
  },
  {
    id: "thrill",
    label: "Thrill",
    blurb: "Tension, twists, keep the lights on.",
    genres: ["Thriller", "Horror", "Crime", "Mystery", "Film-Noir"],
  },
  {
    id: "escape",
    label: "Escape",
    blurb: "Other worlds, big journeys, wonder.",
    genres: ["Fantasy", "Adventure", "Sci-Fi", "Animation", "Western"],
  },
  {
    id: "feel",
    label: "Feel something",
    blurb: "Stories that land in the chest.",
    genres: ["Drama", "Romance", "Biography", "War", "History", "Music"],
  },
  {
    id: "amped",
    label: "Amped",
    blurb: "Pulse up — chase, fight, win.",
    genres: ["Action", "Superhero", "Sport", "Adventure", "War"],
  },
];

export function getMood(id: string | null | undefined): Mood | null {
  if (!id) return null;
  return MOODS.find((m) => m.id === id) ?? null;
}

function genreSet(genres: string[]): Set<string> {
  return new Set(genres.map((g) => normalizeCategory(g).toLowerCase()));
}

/** Deterministic shuffle seeded by mood + day so picks feel fresh without flicker. */
function daySeed(moodId: string): number {
  const d = new Date();
  const day = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  let h = 0;
  const s = `${moodId}:${day}`;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function moviesForMood(
  movies: Movie[],
  mood: Mood,
  limit = 9
): Movie[] {
  const wanted = genreSet(mood.genres);
  const matched = movies.filter((m) =>
    wanted.has(normalizeCategory(m.genre).toLowerCase())
  );

  if (matched.length === 0) return [];

  // Prefer a mix: shuffle for variety, but keep recently added weighted forward.
  const recent = sortByRecentlyAdded(matched).slice(0, Math.ceil(limit * 0.6));
  const recentIds = new Set(recent.map((m) => m.id));
  const rest = matched.filter((m) => !recentIds.has(m.id));
  const shuffledRest = seededShuffle(rest, daySeed(mood.id));

  const combined = [...recent, ...shuffledRest];
  const seen = new Set<string>();
  const out: Movie[] = [];
  for (const m of combined) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}
