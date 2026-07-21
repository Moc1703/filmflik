import { NextRequest, NextResponse } from "next/server";
import { isBunnyStorageConfigured, uploadStorageFile } from "@/lib/bunny-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function safeId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "title";
}

export async function POST(request: NextRequest) {
  try {
    if (!isBunnyStorageConfigured()) {
      return NextResponse.json(
        { error: "Bunny Storage is not configured." },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const movieIdRaw = form.get("movieId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be between 1 byte and 5 MB" },
        { status: 400 }
      );
    }

    const mime = (file.type || "").toLowerCase();
    const ext = ALLOWED.get(mime);
    if (!ext) {
      return NextResponse.json(
        { error: "Use JPG, PNG, WebP, or GIF" },
        { status: 400 }
      );
    }

    const movieId =
      typeof movieIdRaw === "string" && movieIdRaw.trim()
        ? safeId(movieIdRaw.trim())
        : "title";
    const stamp = Date.now().toString(36);
    const storagePath = `thumbnails/${movieId}-${stamp}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadStorageFile(storagePath, buffer, mime);

    // Same-origin proxy so Token Auth on the Storage pull zone does not break <img>.
    const url = `/api/thumbnails/${storagePath.replace(/^thumbnails\//, "")}`;

    return NextResponse.json({
      path: storagePath,
      url,
      contentType: mime,
      bytes: buffer.length,
    });
  } catch (error) {
    console.error("[admin/thumbnail]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload thumbnail",
      },
      { status: 500 }
    );
  }
}
