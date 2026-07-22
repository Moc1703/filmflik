import { NextResponse } from "next/server";
import {
  createStreamVideo,
  createTusUploadAuth,
  isBunnyStreamConfigured,
} from "@/lib/bunny-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a Bunny Stream video + TUS upload signature.
 * Client uploads the file bytes directly to Bunny (not through Vercel).
 */
export async function POST(request: Request) {
  if (!isBunnyStreamConfigured()) {
    return NextResponse.json(
      { error: "Bunny Stream is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { title?: string };
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Untitled upload";

    const created = await createStreamVideo(title);
    const auth = createTusUploadAuth(created.videoId);

    return NextResponse.json({
      ok: true,
      ...auth,
      title,
    });
  } catch (error) {
    console.error("[admin/stream/upload]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to prepare upload",
      },
      { status: 500 }
    );
  }
}
