"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieGrid from "@/components/MovieGrid";
import { useCatalog } from "@/lib/use-catalog";
import { filterMovies, searchHref } from "@/lib/search";

function SearchPageBody() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(query);
  const { movies, loading } = useCatalog();

  useEffect(() => {
    setDraft(query);
  }, [query]);

  const results = useMemo(
    () => filterMovies(movies, query),
    [movies, query]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push(searchHref(draft));
  };

  return (
    <main className="ff-atmosphere min-h-screen">
      <Navbar movies={movies} />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16">
        <div className="pt-28 md:pt-32 pb-8 md:pb-12">
          <section>
            <header className="mb-8 md:mb-10">
              <h1 className="ff-display text-foreground text-3xl md:text-4xl font-semibold tracking-tight">
                Search
              </h1>
              <form onSubmit={onSubmit} className="mt-6 max-w-xl">
                <label className="sr-only" htmlFor="search-page-q">
                  Search titles
                </label>
                <input
                  id="search-page-q"
                  type="search"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Title, genre, year…"
                  className="ff-display w-full bg-transparent border-b border-line focus:border-brand/60 text-foreground placeholder:text-muted/40 text-xl md:text-2xl font-semibold tracking-tight py-3 focus:outline-none transition-colors"
                  autoComplete="off"
                  spellCheck={false}
                />
              </form>
              {query ? (
                <p className="text-muted text-sm md:text-base mt-4">
                  {loading
                    ? "Searching…"
                    : results.length === 0
                      ? `No results for “${query}”`
                      : `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”`}
                </p>
              ) : (
                <p className="text-muted text-sm md:text-base mt-4">
                  Type a query and press Enter.
                </p>
              )}
            </header>

            {!loading && query && results.length > 0 ? (
              <MovieGrid movies={results} />
            ) : null}

            {!loading && query && results.length === 0 ? (
              <p className="text-muted text-sm">
                Try another spelling, or browse{" "}
                <Link
                  href="/categories"
                  className="text-brand hover:text-[#efb56f] transition-colors"
                >
                  categories
                </Link>
                .
              </p>
            ) : null}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="ff-atmosphere min-h-screen flex items-center justify-center text-muted text-sm">
          Loading…
        </main>
      }
    >
      <SearchPageBody />
    </Suspense>
  );
}
