import { NextResponse } from "next/server";
import {
  catalogSourceKey,
  normalizeCatalogEntry,
  serializeCatalog,
  toPublicMovie,
  withPreservedAddedAt,
  type CatalogEntry,
} from "@/lib/catalog";
import {
  getCatalog,
  isBunnyStorageConfigured,
  putCatalog,
} from "@/lib/bunny-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const movies = await getCatalog();
    return NextResponse.json({
      configured: isBunnyStorageConfigured(),
      catalog: serializeCatalog(movies),
      movies: movies.map(toPublicMovie),
    });
  } catch (error) {
    console.error("[admin/catalog GET]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load catalog",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!isBunnyStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Bunny Storage is not configured. Set BUNNY_STORAGE_ZONE and BUNNY_STORAGE_KEY.",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { movies?: unknown };
    const raw = Array.isArray(body.movies) ? body.movies : [];
    const movies: CatalogEntry[] = [];
    const rejected: { title?: string; reason: string }[] = [];

    for (const row of raw) {
      const normalized = normalizeCatalogEntry(row);
      if (!normalized) {
        const partial = row as { title?: string; id?: string };
        rejected.push({
          title: partial.title || partial.id || "unknown",
          reason: "Missing id, title, or streamVideoId",
        });
        continue;
      }
      movies.push(normalized);
    }

    if (rejected.length > 0 && movies.length === 0) {
      return NextResponse.json(
        {
          error: `Nothing to save — ${rejected[0]?.reason}`,
          rejected,
        },
        { status: 400 }
      );
    }

    // Ensure unique ids / paths (last write wins so a Release toggle isn't dropped)
    const byKey = new Map<string, CatalogEntry>();
    for (const m of movies) {
      byKey.set(catalogSourceKey(m), m);
    }
    const previous = await getCatalog();
    const unique = withPreservedAddedAt([...byKey.values()], previous);

    await putCatalog(unique);

    const releasedCount = unique.filter((m) => m.released !== false).length;

    return NextResponse.json({
      ok: true,
      catalog: serializeCatalog(unique),
      movies: unique.map(toPublicMovie),
      releasedCount,
      draftCount: unique.length - releasedCount,
      rejected,
    });
  } catch (error) {
    console.error("[admin/catalog PUT]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save catalog",
      },
      { status: 500 }
    );
  }
}
