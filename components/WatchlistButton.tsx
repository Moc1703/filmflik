"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

interface WatchlistButtonProps {
  movieId: string;
  className?: string;
}

export default function WatchlistButton({
  movieId,
  className = "",
}: WatchlistButtonProps) {
  const router = useRouter();
  const [inList, setInList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !movieId) {
      setReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          setSignedIn(false);
          setReady(true);
          return;
        }
        setSignedIn(true);
        const res = await fetch(
          `/api/me/watchlist?movieId=${encodeURIComponent(movieId)}`,
          { cache: "no-store" }
        );
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { inList?: boolean };
          setInList(Boolean(data.inList));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  if (!isSupabaseConfigured() || !ready) return null;

  const toggle = async () => {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(`/watch/${movieId}`)}`);
      return;
    }
    setLoading(true);
    try {
      if (inList) {
        const res = await fetch(
          `/api/me/watchlist?movieId=${encodeURIComponent(movieId)}`,
          { method: "DELETE" }
        );
        if (res.ok) setInList(false);
      } else {
        const res = await fetch("/api/me/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movieId }),
        });
        if (res.ok) setInList(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void toggle()}
      className={`inline-flex items-center justify-center gap-2 border border-line bg-foreground/5 hover:bg-foreground/10 disabled:opacity-60 text-foreground px-5 py-3.5 font-semibold transition-colors ${className}`}
      aria-pressed={inList}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : inList ? (
        <Check className="w-4 h-4 text-brand" />
      ) : (
        <Plus className="w-4 h-4" />
      )}
      {inList ? "In My List" : "My List"}
    </button>
  );
}
