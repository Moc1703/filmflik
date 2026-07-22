"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next =
    search.get("next") &&
    search.get("next")!.startsWith("/") &&
    !search.get("next")!.startsWith("//")
      ? search.get("next")!
      : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [error, setError] = useState<string | null>(() => {
    const e = search.get("error");
    if (e === "config") return "Set Supabase env vars in .env.local, then restart.";
    if (e === "auth") return "Could not complete sign-in. Try again.";
    return null;
  });
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <main className="ff-atmosphere min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <p className="ff-display text-sm font-extrabold tracking-tight mb-6">
            FILM<span className="text-brand">flik</span>
          </p>
          <h1 className="ff-display text-3xl font-semibold tracking-tight mb-2">
            Sign in
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            Add <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            to <code className="text-foreground">.env.local</code>, run the SQL
            migration, then restart the app.
          </p>
          <Link
            href="/"
            className="inline-block mt-8 text-sm text-brand hover:text-[#efb56f]"
          >
            ← Back home
          </Link>
        </div>
      </main>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      if (mode === "magic") {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (err) throw err;
        setInfo("Check your email for the magic link.");
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ff-atmosphere min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="ff-display text-sm font-extrabold tracking-tight text-foreground mb-6 inline-block"
        >
          FILM<span className="text-brand">flik</span>
        </Link>
        <h1 className="ff-display text-3xl font-semibold tracking-tight text-foreground mb-2">
          Sign in
        </h1>
        <p className="text-muted text-sm mb-8 leading-relaxed">
          Sign in to watch films and sync your list across devices.
        </p>

        <div className="flex gap-4 mb-6 text-sm">
          <button
            type="button"
            className={
              mode === "password"
                ? "text-brand font-semibold"
                : "text-muted hover:text-foreground"
            }
            onClick={() => setMode("password")}
          >
            Password
          </button>
          <button
            type="button"
            className={
              mode === "magic"
                ? "text-brand font-semibold"
                : "text-muted hover:text-foreground"
            }
            onClick={() => setMode("magic")}
          >
            Magic link
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-xs text-muted">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full bg-surface border border-line px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand/60"
              autoFocus
              required
            />
          </label>

          {mode === "password" && (
            <label className="block text-xs text-muted">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full bg-surface border border-line px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand/60"
                required
                minLength={6}
              />
            </label>
          )}

          {error && (
            <p className="text-[#e07a6a] text-sm border border-[#e07a6a]/30 bg-[#e07a6a]/10 px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-brand text-sm border border-brand/30 bg-brand/10 px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-[#efb56f] disabled:opacity-60 text-[#1a1208] px-4 py-3 font-semibold transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "magic" ? "Send magic link" : "Sign in"}
          </button>
        </form>

        <p className="text-muted text-sm mt-8">
          No account?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="text-brand hover:text-[#efb56f] font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="ff-atmosphere min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
