"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { migrateLocalProgressToServer } from "@/lib/progress-sync";

type AuthUser = {
  email: string | null;
  displayName: string | null;
};

export default function AuthNavMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const migratedRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    const supabase = createClient();

    const applyUser = async (uid: string | null, email: string | null) => {
      if (!uid) {
        setUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", uid)
        .maybeSingle();
      setUser({
        email,
        displayName: profile?.display_name ?? email?.split("@")[0] ?? null,
      });

      if (!migratedRef.current) {
        migratedRef.current = true;
        void migrateLocalProgressToServer();
      }
    };

    void supabase.auth.getUser().then(({ data }) => {
      void applyUser(data.user?.id ?? null, data.user?.email ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isSupabaseConfigured()) return null;
  if (!ready) {
    return <div className="w-9 h-9" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-foreground/65 hover:text-foreground transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const label = user.displayName || user.email || "Account";

  const signOut = async () => {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
    router.push("/");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="ff-icon-btn"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <User className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 border border-line bg-surface-raised shadow-lg py-2 z-50">
          <p className="px-3 py-1.5 text-xs text-muted truncate" title={label}>
            {label}
          </p>
          <Link
            href="/my-list"
            className="block px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            My List
          </Link>
          <Link
            href="/history"
            className="block px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            History
          </Link>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
