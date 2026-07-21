"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (search.get("error") === "config") {
      return "Set ADMIN_PASSWORD in .env.local, then restart npm run dev.";
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      const next = search.get("next");
      router.replace(
        next && next.startsWith("/admin") && !next.startsWith("/admin/login")
          ? next
          : "/admin"
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ff-atmosphere min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="ff-display text-sm font-extrabold tracking-tight text-foreground mb-6">
          FILM<span className="text-brand">flik</span>
        </p>
        <h1 className="ff-display text-3xl font-semibold tracking-tight text-foreground mb-2">
          Admin login
        </h1>
        <p className="text-muted text-sm mb-8 leading-relaxed">
          Enter the release panel password to manage the catalog.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-xs text-muted">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full bg-surface border border-line px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand/60"
              autoFocus
              required
            />
          </label>

          {error && (
            <p className="text-[#e07a6a] text-sm border border-[#e07a6a]/30 bg-[#e07a6a]/10 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-[#efb56f] disabled:opacity-40 text-[#1a1208] py-2.5 text-sm font-semibold transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Sign in
          </button>
        </form>

        <p className="mt-8 text-sm text-muted">
          <Link href="/" className="hover:text-foreground transition-colors">
            ← Back to site
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="ff-atmosphere min-h-screen flex items-center justify-center text-muted text-sm">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
