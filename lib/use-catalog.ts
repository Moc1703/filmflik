"use client";

import { useCallback, useEffect, useState } from "react";
import type { Movie } from "@/lib/movies";

export function useCatalog() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog", { cache: "no-store" });
      const data = (await res.json()) as {
        movies?: Movie[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Failed to load catalog");
      }
      setMovies(data.movies ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { movies, loading, error, refresh };
}

export function useMovie(id: string) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(`/api/catalog/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          movie?: Movie;
          error?: string;
        };
        if (!res.ok || !data.movie) {
          throw new Error(data.error || "Movie not found");
        }
        if (!cancelled) setMovie(data.movie);
      } catch (err) {
        if (!cancelled) {
          setMovie(null);
          setError(err instanceof Error ? err.message : "Movie not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { movie, loading, error };
}
