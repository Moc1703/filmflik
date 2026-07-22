"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type SessionState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // The recovery link is exchanged for a session by /auth/callback before
  // landing here — no session means the link was expired or already used.
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSessionState("invalid");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) setSessionState(user ? "ready" : "invalid");
      } catch {
        if (!cancelled) setSessionState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update the password"
      );
    } finally {
      setLoading(false);
    }
  };

  if (sessionState === "checking") {
    return (
      <main className="ff-atmosphere min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </main>
    );
  }

  return (
    <main className="ff-atmosphere min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="ff-display text-sm font-extrabold tracking-tight text-foreground mb-6 inline-block"
        >
          FILM<span className="text-brand">flik</span>
        </Link>

        {sessionState === "invalid" ? (
          <>
            <h1 className="ff-display text-3xl font-semibold tracking-tight text-foreground mb-2">
              Link expired
            </h1>
            <p className="text-muted text-sm leading-relaxed">
              This reset link is no longer valid. Request a new one and open it
              from the most recent email.
            </p>
            <p className="text-muted text-sm mt-8">
              <Link
                href="/forgot-password"
                className="text-brand hover:text-[#efb56f] font-medium"
              >
                Request a new link
              </Link>
            </p>
          </>
        ) : done ? (
          <>
            <h1 className="ff-display text-3xl font-semibold tracking-tight text-foreground mb-2">
              Password updated
            </h1>
            <p className="text-muted text-sm leading-relaxed">
              You&apos;re signed in with your new password.
            </p>
            <Link
              href="/"
              className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-[#efb56f] text-[#1a1208] px-4 py-3 font-semibold transition-colors"
            >
              Start watching
            </Link>
          </>
        ) : (
          <>
            <h1 className="ff-display text-3xl font-semibold tracking-tight text-foreground mb-2">
              Set a new password
            </h1>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              Choose a password you don&apos;t use anywhere else.
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block text-xs text-muted">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full bg-surface border border-line px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand/60"
                  autoFocus
                  required
                  minLength={6}
                />
              </label>

              <label className="block text-xs text-muted">
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1.5 w-full bg-surface border border-line px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand/60"
                  required
                  minLength={6}
                />
              </label>

              {error && (
                <p className="text-[#e07a6a] text-sm border border-[#e07a6a]/30 bg-[#e07a6a]/10 px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-[#efb56f] disabled:opacity-60 text-[#1a1208] px-4 py-3 font-semibold transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update password
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
