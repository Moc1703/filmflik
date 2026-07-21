"use client";

import { useParams, useRouter } from "next/navigation";
import {
  clearWatchProgress,
  formatProgressTime,
  getWatchProgress,
  type WatchProgress,
} from "@/lib/player-storage";
import { ArrowLeft, Loader2, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PosterImage from "@/components/PosterImage";
import VideoPlayer from "@/components/player/VideoPlayer";
import EndRecommendations from "@/components/player/EndRecommendations";
import { useCatalog, useMovie } from "@/lib/use-catalog";
import { pickRecommendations } from "@/lib/recommendations";
import { resolveThumbnail } from "@/lib/thumbnail";

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const { movie, loading: movieLoading, error: movieError } = useMovie(movieId);
  const { movies } = useCatalog();
  const [isPlaying, setIsPlaying] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] = useState<WatchProgress | null>(
    null
  );

  const recommendations = useMemo(
    () => (movie ? pickRecommendations(movie, movies, 4) : []),
    [movie, movies]
  );

  useEffect(() => {
    setIsPlaying(false);
    setStreamUrl(null);
    setStartAt(0);
    setResolveError(null);
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

  if (movieLoading) {
    return (
      <div className="bg-background h-screen w-screen fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!movie || movieError) {
    return (
      <div className="bg-background h-screen w-screen fixed inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="ff-display text-foreground text-2xl font-semibold tracking-tight">
          Title not found
        </p>
        <p className="text-muted text-sm mt-2 mb-8">
          It may not be released yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back home
        </Link>
      </div>
    );
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

  const progressPct =
    savedProgress && savedProgress.duration > 0
      ? Math.min(100, (savedProgress.time / savedProgress.duration) * 100)
      : 0;

  return (
    <div className="bg-background h-screen w-screen overflow-hidden fixed inset-0">
      {!isPlaying || !streamUrl ? (
        <div className="relative w-full h-full ff-atmosphere">
          <PosterImage
            src={movie.thumbnail}
            alt=""
            fill
            priority
            className="object-cover opacity-30 scale-105"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(11,13,18,0.96)_0%,rgba(11,13,18,0.82)_45%,rgba(11,13,18,0.55)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(11,13,18)_0%,transparent_55%)]" />

          <div className="relative z-10 h-full mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16 flex flex-col">
            <header className="pt-5 md:pt-6 flex items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <p className="ff-display text-sm font-extrabold tracking-tight text-foreground">
                FILM<span className="text-brand">flik</span>
              </p>
            </header>

            <div className="flex-1 flex items-center py-10 md:py-14">
              <div className="grid w-full grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
                <div className="md:col-span-5 lg:col-span-4">
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface ff-rise">
                    <PosterImage
                      src={movie.thumbnail}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 40vw"
                      priority
                    />
                  </div>
                </div>

                <div className="md:col-span-7 lg:col-span-8 ff-rise ff-rise-delay-1">
                  <p className="text-brand text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                    Ready to play
                  </p>
                  <h1 className="ff-display text-foreground text-3xl md:text-5xl font-semibold tracking-tight text-balance">
                    {movie.title}
                  </h1>
                  <p className="text-muted text-sm mt-4">{meta}</p>
                  <p className="text-foreground/80 text-base md:text-lg mt-4 max-w-2xl leading-relaxed">
                    {movie.description}
                  </p>

                  {resolveError && (
                    <p className="text-[#e07a6a] text-sm mt-5 max-w-md">
                      {resolveError}
                    </p>
                  )}

                  {savedProgress ? (
                    <div className="mt-8 max-w-md">
                      <p className="text-muted text-sm mb-2">
                        Left off at{" "}
                        <span className="text-foreground tabular-nums font-medium">
                          {formatProgressTime(savedProgress.time)}
                        </span>
                        {savedProgress.duration > 0 && (
                          <span className="text-muted">
                            {" "}
                            / {formatProgressTime(savedProgress.duration)}
                          </span>
                        )}
                      </p>
                      {savedProgress.duration > 0 && (
                        <div className="h-0.5 bg-foreground/15 overflow-hidden mb-6">
                          <div
                            className="h-full bg-brand"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          disabled={resolving}
                          onClick={() => void playFrom(savedProgress.time)}
                          className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-[#efb56f] disabled:opacity-60 text-[#1a1208] px-6 py-3.5 font-semibold transition-colors"
                        >
                          {resolving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Play className="w-5 h-5" fill="currentColor" />
                          )}
                          Resume
                        </button>
                        <button
                          type="button"
                          disabled={resolving}
                          onClick={playFromStart}
                          className="inline-flex items-center justify-center gap-2 border border-line bg-foreground/5 hover:bg-foreground/10 disabled:opacity-60 text-foreground px-6 py-3.5 font-semibold transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Start over
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8">
                      <button
                        type="button"
                        disabled={resolving}
                        onClick={() => void playFrom(0)}
                        className="inline-flex items-center gap-2 bg-brand hover:bg-[#efb56f] disabled:opacity-60 text-[#1a1208] px-7 py-3.5 font-semibold transition-colors"
                      >
                        {resolving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Play className="w-5 h-5" fill="currentColor" />
                        )}
                        {resolving ? "Preparing…" : "Watch now"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <VideoPlayer
          src={streamUrl}
          title={movie.title}
          movieId={movie.id}
          subtitleUrl={movie.subtitleUrl}
          poster={resolveThumbnail(movie.thumbnail)}
          meta={meta}
          startAt={startAt}
          onBack={() => router.push("/")}
          pauseInfoDelayMs={30000}
          endRecommendations={
            <EndRecommendations movies={recommendations} />
          }
          infoOverlay={
            <div className="text-left max-w-2xl px-8">
              <p className="text-brand text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                FILMflik
              </p>
              <h2 className="ff-display text-foreground text-3xl md:text-5xl font-semibold mb-4 tracking-tight">
                {movie.title}
              </h2>
              <p className="text-muted mb-5 text-sm">{meta}</p>
              <p className="text-foreground/80 text-base md:text-lg leading-relaxed">
                {movie.description}
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}
