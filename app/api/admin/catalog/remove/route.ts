import { NextResponse } from "next/server";
import {
  catalogSourceKey,
  serializeCatalog,
} from "@/lib/catalog";
import {
  getCatalog,
  isBunnyStorageConfigured,
  putCatalog,
} from "@/lib/bunny-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remove a title from catalog.json (draft or live).
 * Bunny video files are left untouched.
 */
export async function POST(request: Request) {
  if (!isBunnyStorageConfigured()) {
    return NextResponse.json(
      { error: "Bunny Storage is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      path?: string;
      streamVideoId?: string;
    };

    const catalog = await getCatalog();
    const before = catalog.length;

    const matchIndex = catalog.findIndex((entry) => {
      if (body.id && entry.id === body.id) return true;
      if (body.path && catalogSourceKey(entry) === body.path) return true;
      if (
        body.streamVideoId &&
        entry.streamVideoId === body.streamVideoId
      ) {
        return true;
      }
      return false;
    });

    if (matchIndex < 0) {
      return NextResponse.json(
        { error: "Title not found in catalog" },
        { status: 404 }
      );
    }

    const next = catalog.filter((_, i) => i !== matchIndex);
    await putCatalog(next);

    return NextResponse.json({
      ok: true,
      removed: before - next.length,
      catalog: serializeCatalog(next),
    });
  } catch (error) {
    console.error("[admin/catalog/remove]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove title",
      },
      { status: 500 }
    );
  }
}
