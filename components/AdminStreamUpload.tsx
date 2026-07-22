"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import * as tus from "tus-js-client";

type UploadSession = {
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
  endpoint: string;
  title: string;
};

interface AdminStreamUploadProps {
  disabled?: boolean;
  onUploaded: (info: { videoId: string; title: string }) => void;
}

function titleFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Untitled upload";
}

export default function AdminStreamUpload({
  disabled,
  onUploaded,
}: AdminStreamUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const abortUpload = () => {
    uploadRef.current?.abort(true);
    uploadRef.current = null;
    setUploading(false);
    setProgress(0);
  };

  const startUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const title = titleFromFileName(file.name);
      const res = await fetch("/api/admin/stream/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await res.json()) as UploadSession & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not prepare upload");
      }

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: data.endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: data.authorizationSignature,
            AuthorizationExpire: String(data.authorizationExpire),
            VideoId: data.videoId,
            LibraryId: data.libraryId,
          },
          metadata: {
            filename: file.name,
            filetype: file.type || "video/mp4",
            title: data.title,
          },
          onError(err) {
            reject(err);
          },
          onProgress(bytesUploaded, bytesTotal) {
            if (bytesTotal > 0) {
              setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
            }
          },
          onSuccess() {
            resolve();
          },
        });
        uploadRef.current = upload;
        upload.start();
      });

      setProgress(100);
      onUploaded({ videoId: data.videoId, title: data.title });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      uploadRef.current = null;
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="border border-line px-4 py-4 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Upload to Stream</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            File goes straight to Bunny Stream (resumable). Then edit title,
            thumbnail, and release like other titles.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {uploading ? (
            <button
              type="button"
              onClick={abortUpload}
              className="border border-line bg-foreground/5 hover:bg-foreground/10 text-foreground px-3 py-2 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.mov,.webm,.m4v"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void startUpload(file);
            }}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 bg-brand hover:bg-[#efb56f] disabled:opacity-40 text-[#1a1208] px-4 py-2 text-xs font-semibold transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploading ? `Uploading ${progress}%` : "Upload video"}
          </button>
        </div>
      </div>

      {uploading ? (
        <div className="mt-3 h-1 bg-foreground/10 overflow-hidden">
          <div
            className="h-full bg-brand transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-[#e07a6a] text-xs mt-3 border border-[#e07a6a]/30 bg-[#e07a6a]/10 px-3 py-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
