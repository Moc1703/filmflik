import { NextRequest, NextResponse } from "next/server";
import { isBunnyStorageConfigured, uploadStorageFile } from "@/lib/bunny-storage";
import { toWebVtt } from "@/lib/subtitle-convert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

function safeId(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "title"
  );
}

function looksLikeSubtitle(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (name.endsWith(".vtt") || name.endsWith(".srt")) return true;
  return (
    type.includes("vtt") ||
    type.includes("srt") ||
    type === "text/plain" ||
    type === "application/x-subrip" ||
    type === "text/vtt"
  );
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
        { error: "Subtitle must be between 1 byte and 2 MB" },
        { status: 400 }
      );
    }
    if (!looksLikeSubtitle(file)) {
      return NextResponse.json(
        { error: "Use a .vtt or .srt subtitle file" },
        { status: 400 }
      );
    }

    const rawText = await file.text();
    const vtt = toWebVtt(rawText);
    const movieId =
      typeof movieIdRaw === "string" && movieIdRaw.trim()
        ? safeId(movieIdRaw.trim())
        : "title";
    const stamp = Date.now().toString(36);
    const storagePath = `subtitles/${movieId}-${stamp}.vtt`;
    const buffer = Buffer.from(vtt, "utf8");

    await uploadStorageFile(storagePath, buffer, "text/vtt; charset=utf-8");

    const url = `/api/subtitles/${storagePath.replace(/^subtitles\//, "")}`;

    return NextResponse.json({
      path: storagePath,
      url,
      contentType: "text/vtt",
      bytes: buffer.length,
    });
  } catch (error) {
    console.error("[admin/subtitle]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload subtitle",
      },
      { status: 500 }
    );
  }
}
