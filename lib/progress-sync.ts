"use client";

import {
  clearWatchProgress,
  getAllWatchProgress,
  type WatchProgress,
} from "@/lib/player-storage";

const MIGRATED_KEY = "ff:progress-migrated-v1";

/**
 * One-time push of localStorage continue-watching into Supabase.
 * Safe to call repeatedly; only runs once per browser after success.
 */
export async function migrateLocalProgressToServer(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATED_KEY) === "1") return;
  } catch {
    return;
  }

  const entries = getAllWatchProgress();
  if (entries.length === 0) {
    try {
      localStorage.setItem(MIGRATED_KEY, "1");
    } catch {
      // ignore
    }
    return;
  }

  try {
    const res = await fetch("/api/me/progress/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: entries.map((e) => ({
          movieId: e.movieId,
          positionSeconds: e.progress.time,
          durationSeconds: e.progress.duration,
          updatedAt: e.progress.updatedAt,
        })),
      }),
    });
    if (!res.ok) return;

    for (const e of entries) {
      clearWatchProgress(e.movieId);
    }
    localStorage.setItem(MIGRATED_KEY, "1");
  } catch {
    // retry next session
  }
}

export async function fetchServerProgress(
  movieId: string
): Promise<WatchProgress | null> {
  try {
    const res = await fetch(`/api/me/progress?movieId=${encodeURIComponent(movieId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      progress?: {
        positionSeconds: number;
        durationSeconds: number;
        updatedAt: string;
        completed?: boolean;
      } | null;
    };
    const p = data.progress;
    if (!p || p.completed) return null;
    if (p.positionSeconds < 5) return null;
    if (
      p.durationSeconds > 0 &&
      p.positionSeconds / p.durationSeconds > 0.95
    ) {
      return null;
    }
    return {
      time: p.positionSeconds,
      duration: p.durationSeconds,
      updatedAt: new Date(p.updatedAt).getTime(),
    };
  } catch {
    return null;
  }
}

export async function saveServerProgress(
  movieId: string,
  time: number,
  duration: number
): Promise<void> {
  if (!movieId || !Number.isFinite(time) || !Number.isFinite(duration)) return;
  if (time < 5) return;
  const completed = duration > 0 && time / duration > 0.95;
  try {
    await fetch("/api/me/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId,
        positionSeconds: completed ? 0 : time,
        durationSeconds: duration,
        completed,
      }),
    });
  } catch {
    // offline / transient
  }
}

export async function deleteServerProgress(movieId: string): Promise<void> {
  try {
    await fetch(`/api/me/progress?movieId=${encodeURIComponent(movieId)}`, {
      method: "DELETE",
    });
  } catch {
    // ignore
  }
}
