"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <main className="ff-atmosphere min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <h1 className="ff-display text-3xl font-semibold tracking-tight mb-2">
            Reset password
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
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not send the reset link");
      }
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the reset link"
      );
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

        {sent ? (
          <>
            <MailCheck className="w-8 h-8 text-brand mb-4" />
            <h1 className="ff-display text-3xl font-semibold tracking-tight text-foreground mb-2">
              Check your inbox
            </h1>
            <p className="text-muted text-sm leading-relaxed">
              If that email has an account, a reset link is on its way. The link
              expires in about an hour.
            </p>
            <p className="text-muted text-sm mt-8">
              <Link
                href="/login"
                className="text-brand hover:text-[#efb56f] font-medium"
              >
                ← Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="ff-display text-3xl font-semibold tracking-tight text-foreground mb-2">
              Reset password
            </h1>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              Enter your email and we&apos;ll send you a link to set a new
              password.
            </p>

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
                Send reset link
              </button>
            </form>

            <p className="text-muted text-sm mt-8">
              Remembered it?{" "}
              <Link
                href="/login"
                className="text-brand hover:text-[#efb56f] font-medium"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
