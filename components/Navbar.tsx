"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { movies } from "@/lib/movies";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredMovies = searchQuery.trim()
    ? movies.filter((movie) => {
        const q = searchQuery.toLowerCase();
        return (
          movie.title.toLowerCase().includes(q) ||
          movie.genre.toLowerCase().includes(q) ||
          String(movie.year).includes(q)
        );
      })
    : [];

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
  };

  const navLinkClass =
    "text-sm font-medium text-white/80 hover:text-white transition";

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
        scrolled || showSearch
          ? "bg-black/95 backdrop-blur-md border-b border-white/5"
          : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-12 lg:px-16 py-3 md:py-4">
        <div className="flex items-center gap-6 md:gap-10">
          <Link
            href="/"
            className="text-brand text-2xl md:text-3xl font-bold tracking-tight shrink-0"
          >
            FILM<span className="text-white font-semibold">flik</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={navLinkClass}>
              Home
            </Link>
            <a href="#movies" className={navLinkClass}>
              Movies
            </a>
            <a href="#latest" className={navLinkClass}>
              Latest
            </a>
            <a href="#genres" className={navLinkClass}>
              Genres
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="ff-icon-btn"
            onClick={() => setShowSearch((v) => !v)}
            aria-label="Search"
            aria-expanded={showSearch}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="border-t border-white/5 px-4 md:px-12 lg:px-16 pb-4 pt-3">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="search"
              placeholder="Search by title, genre, or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 text-white placeholder:text-white/40 px-4 py-3 rounded-xl pr-11 focus:outline-none focus:ring-2 focus:ring-brand/80 border border-white/10"
              autoFocus
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1"
              onClick={closeSearch}
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {searchQuery.trim() && (
            <div className="max-w-2xl mx-auto mt-3 rounded-xl bg-zinc-950/90 border border-white/10 max-h-80 overflow-y-auto shadow-2xl">
              {filteredMovies.length > 0 ? (
                filteredMovies.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    className="flex w-full items-center gap-4 p-3 hover:bg-white/5 transition text-left border-b border-white/5 last:border-0"
                    onClick={() => {
                      router.push(`/watch/${movie.id}`);
                      closeSearch();
                    }}
                  >
                    <Image
                      src={movie.thumbnail}
                      alt={movie.title}
                      width={80}
                      height={48}
                      className="w-20 h-12 object-cover rounded-md shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {movie.title}
                      </h3>
                      <p className="text-white/45 text-sm">
                        {movie.year} · {movie.genre}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-white/45 text-center py-8 text-sm">
                  No movies found
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
