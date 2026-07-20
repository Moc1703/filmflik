"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { getMovieById } from "@/lib/movies";
import {
  clearWatchProgress,
  formatProgressTime,
  getWatchProgress,
  type WatchProgress,
} from "@/lib/player-storage";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import VideoPlayer from "@/components/player/VideoPlayer";

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const movie = getMovieById(movieId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] = useState<WatchProgress | null>(
    null
  );

  useEffect(() => {
    setSavedProgress(getWatchProgress(movieId));
  }, [movieId]);

  useEffect(() => {
    const lockOrientation = async () => {
      if (!isPlaying) return;
      try {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (orientation?.lock) {
          await orientation.lock("landscape").catch(() => undefined);
        }
      } catch {
        // Not supported on all browsers
      }
    };

    const unlockOrientation = () => {
      try {
        const orientation = screen.orientation as ScreenOrientation & {
          unlock?: () => void;
        };
        orientation?.unlock?.();
      } catch {
        // ignore
      }
    };

    if (isPlaying) {
      void lockOrientation();
    }

    return () => unlockOrientation();
  }, [isPlaying]);

  if (!movie) {
    notFound();
  }

  const liveDuration =
    savedProgress && savedProgress.duration > 0
      ? formatProgressTime(savedProgress.duration)
      : movie.duration;

  const meta = `${movie.year} · ${liveDuration} · ${movie.genre}`;

  const playFrom = async (time: number) => {
    setResolveError(null);
    setResolving(true);
    try {
      const res = await fetch(`/api/stream/${movie.id}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not get playback URL");
      }
      setStreamUrl(data.url);
      setStartAt(time);
      setIsPlaying(true);
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : "Failed to start playback"
      );
    } finally {
      setResolving(false);
    }
  };

  const playFromStart = () => {
    clearWatchProgress(movieId);
    setSavedProgress(null);
    void playFrom(0);
  };

  return (
    <div className="bg-black h-screen w-screen overflow-hidden fixed inset-0">
      {!isPlaying || !streamUrl ? (
        <div className="relative w-full h-full">
          <Image
            src={movie.thumbnail}
            alt=""
            fill
            priority
            className="object-cover opacity-40 blur-[2px] scale-105"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50" />

          <Link
            href="/"
            className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 text-sm font-medium transition border border-white/10"
          >
            ← Back
          </Link>

          <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
            <p className="text-brand text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              FILMflik
            </p>
            <h1 className="text-white text-3xl md:text-5xl font-bold mb-4 max-w-3xl">
              {movie.title}
            </h1>
            <p className="text-white/55 text-sm md:text-base mb-4">{meta}</p>
            <p className="text-white/75 text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
              {movie.description}
            </p>

            {resolveError && (
              <p className="text-red-400 text-sm mb-4 max-w-md">{resolveError}</p>
            )}

            {savedProgress ? (
              <div className="w-full max-w-md space-y-4">
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-left">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">
                    Continue watching
                  </p>
                  <p className="text-white text-sm">
                    Left off at{" "}
                    <span className="font-semibold tabular-nums">
                      {formatProgressTime(savedProgress.time)}
                    </span>
                    {savedProgress.duration > 0 && (
                      <span className="text-white/45">
                        {" "}
                        / {formatProgressTime(savedProgress.duration)}
                      </span>
                    )}
                  </p>
                  {savedProgress.duration > 0 && (
                    <div className="mt-2 h-1 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (savedProgress.time / savedProgress.duration) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={() => void playFrom(savedProgress.time)}
                    className="group inline-flex items-center justify-center gap-3 bg-brand hover:bg-red-600 disabled:opacity-60 text-white px-6 py-3.5 rounded-xl text-base font-semibold transition shadow-[0_12px_40px_rgba(229,9,20,0.35)]"
                  >
                    {resolving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                    )}
                    Resume
                  </button>
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={playFromStart}
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-60 text-white px-6 py-3.5 rounded-xl text-base font-semibold transition border border-white/10"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Start over
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={resolving}
                onClick={() => void playFrom(0)}
                className="group inline-flex items-center gap-3 bg-brand hover:bg-red-600 disabled:opacity-60 text-white px-8 py-4 rounded-xl text-lg font-semibold transition shadow-[0_12px_40px_rgba(229,9,20,0.35)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/25">
                  {resolving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                  )}
                </span>
                {resolving ? "Preparing…" : "Play Movie"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <VideoPlayer
          src={streamUrl}
          title={movie.title}
          movieId={movie.id}
          subtitleUrl={movie.subtitleUrl}
          poster={movie.thumbnail}
          meta={meta}
          startAt={startAt}
          onBack={() => router.push("/")}
          pauseInfoDelayMs={30000}
          infoOverlay={
            <div className="text-center max-w-3xl px-8">
              <h2 className="text-white text-3xl md:text-5xl font-bold mb-4">
                {movie.title}
              </h2>
              <p className="text-white/55 mb-5">{meta}</p>
              <p className="text-white/80 text-lg md:text-xl leading-relaxed">
                {movie.description}
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}
