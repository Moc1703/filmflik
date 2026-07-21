import "server-only";

import {
  DEFAULT_CATALOG_SEED,
  normalizeCatalog,
  serializeCatalog,
  type CatalogEntry,
} from "@/lib/catalog";

const CATALOG_PATH = "catalog.json";
const CACHE_TTL_MS = 45_000;

export interface StorageFile {
  path: string;
  objectName: string;
  length: number;
  lastChanged: string | null;
  isDirectory: boolean;
}

interface StorageObject {
  Guid?: string;
  ObjectName?: string;
  Path?: string;
  Length?: number;
  LastChanged?: string;
  IsDirectory?: boolean;
}

interface StorageConfig {
  zone: string;
  key: string;
  region: string;
}

let catalogCache: { at: number; movies: CatalogEntry[] } | null = null;

export function isBunnyStorageConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STORAGE_ZONE?.trim() &&
      process.env.BUNNY_STORAGE_KEY?.trim()
  );
}

/** Accept hostname or full URL; never keep path/zone in the region host. */
function normalizeStorageRegion(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "storage.bunnycdn.com";
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).host;
    }
  } catch {
    // fall through
  }
  // "sg.storage.bunnycdn.com/filmflik" → host only
  return trimmed.split("/")[0] || "storage.bunnycdn.com";
}

/** Zone name only — strip accidental URLs/paths. */
function normalizeStorageZone(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      return parts[0] || "";
    }
  } catch {
    // fall through
  }
  return trimmed.split("/").filter(Boolean).pop() || trimmed;
}

function getStorageConfig(): StorageConfig {
  const zone = normalizeStorageZone(process.env.BUNNY_STORAGE_ZONE || "");
  const key = process.env.BUNNY_STORAGE_KEY?.trim();
  const region = normalizeStorageRegion(
    process.env.BUNNY_STORAGE_REGION || "storage.bunnycdn.com"
  );

  if (!zone || !key) {
    throw new Error(
      "Bunny Storage is not configured. Set BUNNY_STORAGE_ZONE and BUNNY_STORAGE_KEY."
    );
  }

  return { zone, key, region };
}

function storageBaseUrl(cfg: StorageConfig = getStorageConfig()): string {
  return `https://${cfg.region}/${cfg.zone}`;
}

function objectPath(file: StorageObject, zone: string, parentDir = ""): string {
  const name = (file.ObjectName || "").replace(/^\//, "");
  if (parentDir) {
    return `${parentDir.replace(/\/$/, "")}/${name}`;
  }
  const rawPath = (file.Path || "").replace(/^\//, "").replace(/\/$/, "");
  if (!rawPath || rawPath === zone) return name;
  const cleaned = rawPath.startsWith(`${zone}/`)
    ? rawPath.slice(zone.length + 1)
    : rawPath;
  // Ignore corrupted paths that accidentally embed a URL host
  if (/https?:/i.test(cleaned) || /storage\.bunnycdn\.com/i.test(cleaned)) {
    return name;
  }
  return cleaned ? `${cleaned}/${name}` : name;
}

async function storageFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const cfg = getStorageConfig();
  const clean = path.replace(/^\//, "");
  const url = `${storageBaseUrl(cfg)}/${clean}`;
  return fetch(url, {
    ...init,
    headers: {
      AccessKey: cfg.key,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

export async function listStorageFiles(
  directory = ""
): Promise<StorageFile[]> {
  const prefix = directory.replace(/^\//, "").replace(/\/$/, "");
  const listPath = prefix ? `${prefix}/` : "";
  const res = await storageFetch(listPath, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to list Bunny Storage (${res.status}): ${text || res.statusText}`
    );
  }

  const data = (await res.json()) as StorageObject[];
  if (!Array.isArray(data)) return [];

  const { zone } = getStorageConfig();
  return data
    .map((item) => {
      const path = objectPath(item, zone, prefix);
      return {
        path,
        objectName: item.ObjectName || path,
        length: typeof item.Length === "number" ? item.Length : 0,
        lastChanged: item.LastChanged || null,
        isDirectory: Boolean(item.IsDirectory),
      };
    })
    .filter((f) => f.path && !f.path.endsWith(`/${CATALOG_PATH}`) && f.path !== CATALOG_PATH);
}

export function invalidateCatalogCache(): void {
  catalogCache = null;
}

export async function getCatalog(): Promise<CatalogEntry[]> {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_TTL_MS) {
    return catalogCache.movies;
  }

  if (!isBunnyStorageConfigured()) {
    return DEFAULT_CATALOG_SEED;
  }

  try {
    const res = await storageFetch(CATALOG_PATH, { method: "GET" });

    if (res.status === 404) {
      catalogCache = { at: Date.now(), movies: DEFAULT_CATALOG_SEED };
      return DEFAULT_CATALOG_SEED;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to read catalog.json (${res.status}): ${text || res.statusText}`
      );
    }

    const json = await res.json();
    const movies = normalizeCatalog(json);
    catalogCache = { at: Date.now(), movies };
    return movies;
  } catch (error) {
    console.error("[bunny-storage] getCatalog", error);
    return DEFAULT_CATALOG_SEED;
  }
}

export async function getCatalogEntryById(
  id: string
): Promise<CatalogEntry | undefined> {
  const movies = await getCatalog();
  return movies.find((m) => m.id === id);
}

export async function putCatalog(movies: CatalogEntry[]): Promise<void> {
  const normalized = normalizeCatalog(serializeCatalog(movies));
  const body = JSON.stringify(serializeCatalog(normalized), null, 2);

  const res = await storageFetch(CATALOG_PATH, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to write catalog.json (${res.status}): ${text || res.statusText}`
    );
  }

  catalogCache = { at: Date.now(), movies: normalized };
}

/** Upload a binary object to Bunny Storage (e.g. thumbnails/foo.jpg). */
export async function uploadStorageFile(
  path: string,
  data: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  const clean = path.replace(/^\//, "");
  if (!clean || clean.includes("..")) {
    throw new Error("Invalid storage path");
  }

  const res = await storageFetch(clean, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      Accept: "application/json",
    },
    body: Buffer.from(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to upload ${clean} (${res.status}): ${text || res.statusText}`
    );
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
