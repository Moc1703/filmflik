"use client";

import { useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CategoryNav from "@/components/CategoryNav";
import MovieGrid from "@/components/MovieGrid";
import {
  categoryHref,
  groupMoviesByCategory,
  listCategories,
} from "@/lib/categories";
import { useCatalog } from "@/lib/use-catalog";

export default function CategoriesPage() {
  const { movies, loading } = useCatalog();
  const categories = useMemo(() => listCategories(movies), [movies]);
  const groups = useMemo(() => groupMoviesByCategory(movies), [movies]);

  return (
    <main className="ff-atmosphere min-h-screen">
      <Navbar movies={movies} />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16">
        <div className="pt-28 md:pt-32 pb-8 md:pb-12">
          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : movies.length === 0 ? (
            <p className="text-muted text-sm">No titles yet.</p>
          ) : (
            <section>
              <header className="mb-8 md:mb-10">
                <h1 className="ff-display text-foreground text-3xl md:text-4xl font-semibold tracking-tight">
                  Categories
                </h1>
                <p className="text-muted text-sm md:text-base mt-2 max-w-lg leading-relaxed">
                  Pick a category or browse every section below.
                </p>
                <CategoryNav categories={categories} active={null} />
              </header>

              <div className="flex flex-col gap-14 md:gap-16">
                {groups.map(({ category, movies: items }) => (
                  <section key={category} aria-labelledby={`cat-${category}`}>
                    <div className="mb-6 flex items-end justify-between gap-4">
                      <h2
                        id={`cat-${category}`}
                        className="ff-display text-foreground text-xl md:text-2xl font-semibold tracking-tight"
                      >
                        <Link
                          href={categoryHref(category)}
                          className="hover:text-brand transition-colors"
                        >
                          {category}
                        </Link>
                      </h2>
                      <Link
                        href={categoryHref(category)}
                        className="text-sm text-muted hover:text-brand transition-colors shrink-0"
                      >
                        View all
                      </Link>
                    </div>
                    <MovieGrid movies={items} />
                  </section>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
