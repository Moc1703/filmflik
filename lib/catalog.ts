import "server-only";

import { DEFAULT_THUMBNAIL, resolveThumbnail } from "@/lib/thumbnail";

/** Catalog entry stored in Bunny Storage `catalog.json`. */
export interface CatalogEntry {
  id: string;
  /** Bunny Stream video GUID for HLS adaptive playback (required). */
  streamVideoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  genre: string;
  year: number;
  subtitleUrl?: string;
  /**
   * When false, kept as an admin draft only (not on the public site).
   * Missing / true = released (legacy catalog entries).
   */
  released?: boolean;
  /** Epoch ms when first saved into catalog (preserved across edits). */
  addedAt?: number;
}

export interface CatalogFile {
  version: 1;
  movies: CatalogEntry[];
}

/** Public movie shape (no stream ids). */
export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  genre: string;
  year: number;
  subtitleUrl?: string;
  /** Epoch ms when first added to the catalog. */
  addedAt?: number;
}

export function toPublicMovie(entry: CatalogEntry): Movie {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    thumbnail: resolveThumbnail(entry.thumbnail),
    duration: entry.duration,
    genre: entry.genre,
    year: entry.year,
    subtitleUrl: entry.subtitleUrl,
    addedAt: entry.addedAt,
  };
}

export function idFromStreamGuid(guid: string): string {
  return `stream-${guid.slice(0, 8).toLowerCase()}`;
}

/** Empty until admin saves Stream titles into catalog.json. */
export const DEFAULT_CATALOG_SEED: CatalogEntry[] = [];

function hasStreamSource(m: Partial<CatalogEntry>): boolean {
  return Boolean(
    typeof m.streamVideoId === "string" && m.streamVideoId.trim()
  );
}

export function normalizeCatalog(input: unknown): CatalogEntry[] {
  if (!input || typeof input !== "object") return [];
  const file = input as Partial<CatalogFile>;
  if (!Array.isArray(file.movies)) return [];

  return file.movies
    .map((m) => normalizeCatalogEntry(m))
    .filter((m): m is CatalogEntry => m !== null);
}

/** Returns null when the row is invalid / missing streamVideoId. */
export function normalizeCatalogEntry(input: unknown): CatalogEntry | null {
  if (!input || typeof input !== "object") return null;
  const m = input as Partial<CatalogEntry> & { bunnyPath?: string };
  if (typeof m.id !== "string" || !m.id.trim()) return null;
  if (typeof m.title !== "string" || !m.title.trim()) return null;
  if (!hasStreamSource(m)) return null;

  return {
    id: m.id.trim(),
    streamVideoId: (m.streamVideoId as string).trim(),
    title: m.title.trim(),
    description:
      typeof m.description === "string"
        ? m.description
        : "A title from the FILMflik library.",
    thumbnail:
      typeof m.thumbnail === "string" && m.thumbnail.trim()
        ? m.thumbnail.trim()
        : DEFAULT_THUMBNAIL,
    duration: typeof m.duration === "string" ? m.duration : "—",
    genre: typeof m.genre === "string" && m.genre.trim() ? m.genre.trim() : "Featured",
    year:
      typeof m.year === "number" && Number.isFinite(m.year)
        ? m.year
        : new Date().getFullYear(),
    subtitleUrl:
      typeof m.subtitleUrl === "string" ? m.subtitleUrl : undefined,
    released: typeof m.released === "boolean" ? m.released : true,
    addedAt:
      typeof m.addedAt === "number" &&
      Number.isFinite(m.addedAt) &&
      m.addedAt > 0
        ? Math.floor(m.addedAt)
        : undefined,
  };
}

/** Public site only lists released titles (legacy entries without the flag count as released). */
export function isCatalogReleased(entry: CatalogEntry): boolean {
  return entry.released !== false;
}

export function serializeCatalog(movies: CatalogEntry[]): CatalogFile {
  return { version: 1, movies };
}

export function catalogSourceKey(entry: CatalogEntry): string {
  return `stream:${entry.streamVideoId}`;
}

/**
 * Keep existing addedAt when updating; stamp Date.now() for brand-new rows.
 * Legacy rows without addedAt get a backfill from their previous catalog order.
 */
export function withPreservedAddedAt(
  incoming: CatalogEntry[],
  previous: CatalogEntry[],
  now = Date.now()
): CatalogEntry[] {
  const prevByKey = new Map(
    previous.map((entry, index) => [catalogSourceKey(entry), { entry, index }])
  );
  return incoming.map((entry) => {
    const hit = prevByKey.get(catalogSourceKey(entry));
    if (hit?.entry.addedAt) {
      return { ...entry, addedAt: hit.entry.addedAt };
    }
    if (entry.addedAt) {
      return { ...entry, addedAt: entry.addedAt };
    }
    if (hit) {
      return {
        ...entry,
        addedAt: now - (previous.length - hit.index) * 1000,
      };
    }
    return { ...entry, addedAt: now };
  });
}
