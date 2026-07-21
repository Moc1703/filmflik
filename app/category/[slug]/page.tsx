"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CategoryNav from "@/components/CategoryNav";
import MovieGrid from "@/components/MovieGrid";
import {
  findCategoryBySlug,
  listCategories,
  moviesInCategory,
} from "@/lib/categories";
import { useCatalog } from "@/lib/use-catalog";

export default function CategoryPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { movies, loading } = useCatalog();

  const categories = useMemo(() => listCategories(movies), [movies]);
  const category = useMemo(
    () => findCategoryBySlug(movies, slug),
    [movies, slug]
  );
  const filtered = useMemo(
    () => (category ? moviesInCategory(movies, category) : []),
    [movies, category]
  );

  return (
    <main className="ff-atmosphere min-h-screen">
      <Navbar movies={movies} />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16">
        <div className="pt-28 md:pt-32 pb-8 md:pb-12">
          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : !category ? (
            <header className="max-w-lg">
              <p className="text-muted text-sm mb-3">
                <Link
                  href="/categories"
                  className="hover:text-foreground transition-colors"
                >
                  ← Categories
                </Link>
              </p>
              <h1 className="ff-display text-foreground text-3xl md:text-4xl font-semibold tracking-tight">
                Category not found
              </h1>
              <p className="text-muted text-sm md:text-base mt-3 leading-relaxed">
                No titles match this category. Browse all categories instead.
              </p>
              <Link
                href="/categories"
                className="inline-block mt-8 text-sm font-semibold text-brand hover:text-[#efb56f] transition-colors"
              >
                Back to categories
              </Link>
            </header>
          ) : (
            <section>
              <header className="mb-8 md:mb-10">
                <p className="text-muted text-sm mb-3">
                  <Link
                    href="/categories"
                    className="hover:text-foreground transition-colors"
                  >
                    ← Categories
                  </Link>
                </p>
                <h1 className="ff-display text-foreground text-3xl md:text-4xl font-semibold tracking-tight">
                  {category}
                </h1>
                <p className="text-muted text-sm md:text-base mt-2">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "title" : "titles"}
                </p>
                <CategoryNav categories={categories} active={category} />
              </header>

              {filtered.length === 0 ? (
                <p className="text-muted text-sm">
                  No titles in this category yet.
                </p>
              ) : (
                <MovieGrid movies={filtered} />
              )}
            </section>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
