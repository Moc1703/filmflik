"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Movie } from "@/lib/movies";
import { useRouter } from "next/navigation";
import PosterImage from "@/components/PosterImage";
import { filterMovies, searchHref } from "@/lib/search";
import AuthNavMenu from "@/components/AuthNavMenu";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface NavbarProps {
  movies?: Movie[];
}

export default function Navbar({ movies = [] }: NavbarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onSlash = (e: KeyboardEvent) => {
      if (e.key !== "/" || showSearch) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setShowSearch(true);
    };
    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, [showSearch]);

  useEffect(() => {
    if (!showSearch) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showSearch]);

  const filteredMovies = filterMovies(movies, searchQuery).slice(0, 8);

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
  };

  const goToResults = (q = searchQuery) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    closeSearch();
    router.push(searchHref(trimmed));
  };

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    goToResults();
  };

  const navLinkClass =
    "text-sm font-medium text-foreground/65 hover:text-foreground transition-colors";

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-[background-color,border-color] duration-300 ${
          scrolled
            ? "bg-background/90 backdrop-blur-md border-b border-line"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto w-full max-w-7xl flex items-center justify-between px-5 md:px-12 lg:px-16 py-4">
          <div className="flex items-center gap-8 md:gap-12">
            <Link
              href="/"
              className="ff-display text-xl md:text-2xl font-extrabold tracking-tight shrink-0 text-foreground"
            >
              FILM<span className="text-brand">flik</span>
            </Link>
            <div className="hidden md:flex items-center gap-7">
              <Link href="/" className={navLinkClass}>
                Home
              </Link>
              <Link href="/categories" className={navLinkClass}>
                Categories
              </Link>
              {isSupabaseConfigured() && (
                <Link href="/my-list" className={navLinkClass}>
                  My List
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button
              type="button"
              className="ff-icon-btn"
              onClick={() => setShowSearch(true)}
              aria-label="Search"
              aria-expanded={showSearch}
            >
              <Search className="w-5 h-5" />
            </button>
            <AuthNavMenu />
          </div>
        </div>
      </nav>

      {showSearch && (
        <div
          className="fixed inset-0 z-[70] ff-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
            onClick={closeSearch}
          />

          <div className="relative z-10 mx-auto w-full max-w-2xl px-5 md:px-8 pt-24 md:pt-32">
            <form
              onSubmit={onSearchSubmit}
              className="relative flex items-center border-b border-line focus-within:border-brand/60 transition-colors"
            >
              <input
                ref={inputRef}
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ff-display w-full bg-transparent text-foreground placeholder:text-muted/40 text-2xl md:text-3xl font-semibold tracking-tight py-4 pr-10 focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="absolute right-0 text-muted hover:text-foreground transition-colors p-1"
                onClick={closeSearch}
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </form>

            {searchQuery.trim() && (
              <div className="mt-6">
                {filteredMovies.length > 0 ? (
                  <>
                    <ul>
                      {filteredMovies.map((movie) => (
                        <li key={movie.id}>
                          <button
                            type="button"
                            className="group flex w-full items-center gap-4 py-3 text-left"
                            onClick={() => {
                              router.push(`/watch/${movie.id}`);
                              closeSearch();
                            }}
                          >
                            <div className="relative w-16 aspect-video overflow-hidden bg-surface shrink-0">
                              <PosterImage
                                src={movie.thumbnail}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="ff-display text-foreground font-semibold tracking-tight truncate group-hover:text-brand transition-colors">
                                {movie.title}
                              </p>
                              <p className="text-muted text-sm mt-0.5">
                                {movie.year}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => goToResults()}
                      className="mt-4 text-sm font-semibold text-brand hover:text-[#efb56f] transition-colors"
                    >
                      See all results →
                    </button>
                  </>
                ) : (
                  <p className="text-muted text-sm py-6">No results</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
