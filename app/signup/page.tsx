"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next =
    search.get("next") &&
    search.get("next")!.startsWith("/") &&
    !search.get("next")!.startsWith("//")
      ? search.get("next")!
      : "/";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <main className="ff-atmosphere min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <h1 className="ff-display text-3xl font-semibold tracking-tight mb-2">
            Create account
          </h1>
          <p className="text-muted text-sm">
            Configure Supabase env vars first, then return here.
          </p>
          <Link href="/login" className="inline-block mt-8 text-sm text-brand">
            ← Sign in
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
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (err) throw err;

      if (data.session) {
        router.replace(next);
        router.refresh();
        return;
      }

      setInfo(
        "Account created. Check your email to confirm, then sign in."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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
          Create account
        </h1>
        <p className="text-muted text-sm mb-8 leading-relaxed">
          One account for watch history and your list.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-xs text-muted">
            Display name
            <input
              type="text"
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 w-full bg-surface border border-line px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand/60"
            />
          </label>
          <label className="block text-xs text-muted">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full bg-surface border border-line px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand/60"
              required
              autoFocus
            />
          </label>
          <label className="block text-xs text-muted">
            Password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            Create account
          </button>
        </form>

        <p className="text-muted text-sm mt-8">
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-brand hover:text-[#efb56f] font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="ff-atmosphere min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
