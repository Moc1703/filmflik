"use client";

import Link from "next/link";
import { Play, Info, X } from "lucide-react";
import type { Movie } from "@/lib/movies";
import { useEffect, useMemo, useState } from "react";
import PosterImage from "@/components/PosterImage";

interface HeroProps {
  movies: Movie[];
  loading?: boolean;
}

const ROTATE_MS = 7000;

function buildSlides(movies: Movie[]): Movie[] {
  if (movies.length === 0) return [];
  const featured = movies.filter((m) => m.genre === "Featured");
  const rest = movies.filter((m) => m.genre !== "Featured");
  // Featured first, then the rest — always rotate across the catalog
  const ordered = [...featured, ...rest];
  const seen = new Set<string>();
  const unique: Movie[] = [];
  for (const movie of ordered) {
    if (seen.has(movie.id)) continue;
    seen.add(movie.id);
    unique.push(movie);
    if (unique.length >= 5) break;
  }
  return unique;
}

export default function Hero({ movies, loading }: HeroProps) {
  const slides = useMemo(() => buildSlides(movies), [movies]);
  const slideKey = slides.map((m) => m.id).join("|");

  const [index, setIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const featuredMovie = slides[index] ?? slides[0] ?? null;
  const canRotate = slides.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [slideKey]);

  useEffect(() => {
    if (!canRotate || showModal) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [canRotate, showModal, slides.length]);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [showModal]);

  if (loading && !featuredMovie) {
    return (
      <section className="relative h-[100svh] min-h-[34rem] w-full overflow-hidden bg-background">
        <div className="relative h-full mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16 flex flex-col justify-end pb-16 md:pb-24 pt-28">
          <p className="ff-display text-[clamp(3.25rem,12vw,7.5rem)] leading-[0.88] font-extrabold tracking-tight text-foreground">
            FILM<span className="text-brand">flik</span>
          </p>
          <p className="text-muted mt-6">Loading catalog…</p>
        </div>
      </section>
    );
  }

  if (!featuredMovie) {
    return (
      <section className="relative h-[100svh] min-h-[34rem] w-full overflow-hidden bg-background">
        <div className="relative h-full mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16 flex flex-col justify-end pb-16 md:pb-24 pt-28">
          <p className="ff-display text-[clamp(3.25rem,12vw,7.5rem)] leading-[0.88] font-extrabold tracking-tight text-foreground">
            FILM<span className="text-brand">flik</span>
          </p>
          <p className="text-muted mt-6 max-w-md leading-relaxed">
            No titles released yet. Open /admin to pick videos from Bunny.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative h-[100svh] min-h-[34rem] w-full overflow-hidden">
        <div className="absolute inset-0">
          {slides.map((movie, i) => (
            <div
              key={movie.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                i === index ? "opacity-100 z-[1]" : "opacity-0 z-0"
              }`}
              aria-hidden={i !== index}
            >
              <PosterImage
                src={movie.thumbnail}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className={`object-cover ${i === index ? "ff-ken" : ""}`}
              />
            </div>
          ))}
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(105deg,rgba(11,13,18,0.92)_0%,rgba(11,13,18,0.55)_42%,rgba(11,13,18,0.25)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(to_top,rgba(11,13,18)_0%,rgba(11,13,18,0.45)_38%,transparent_68%)]" />
        </div>

        <div className="relative z-[3] h-full mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16 flex flex-col justify-end pb-16 md:pb-24 pt-28">
          <div className="max-w-3xl" key={featuredMovie.id}>
            <p className="ff-display ff-rise text-[clamp(3.25rem,12vw,7.5rem)] leading-[0.88] font-extrabold tracking-tight text-foreground">
              FILM<span className="text-brand">flik</span>
            </p>
            <h1 className="ff-display ff-rise ff-rise-delay-1 mt-5 md:mt-7 text-2xl md:text-4xl font-semibold tracking-tight text-foreground text-balance">
              {featuredMovie.title}
            </h1>
            <p className="ff-rise ff-rise-delay-2 mt-3 md:mt-4 text-base md:text-lg text-muted max-w-xl leading-relaxed line-clamp-3">
              {featuredMovie.description}
            </p>
            <div className="ff-rise ff-rise-delay-3 mt-7 md:mt-8 flex flex-wrap gap-3">
              <Link
                href={`/watch/${featuredMovie.id}`}
                className="inline-flex items-center gap-2 bg-brand text-[#1a1208] px-6 py-3.5 font-semibold tracking-wide hover:bg-[#efb56f] transition-colors"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Watch now
              </Link>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 border border-line bg-foreground/5 hover:bg-foreground/10 text-foreground px-6 py-3.5 font-semibold transition-colors backdrop-blur-sm"
              >
                <Info className="w-5 h-5" />
                Details
              </button>
            </div>

            {canRotate && (
              <div
                className="mt-8 flex items-center gap-2"
                role="tablist"
                aria-label="Featured titles"
              >
                {slides.map((movie, i) => (
                  <button
                    key={movie.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={movie.title}
                    onClick={() => setIndex(i)}
                    className={`h-1 transition-all duration-300 ${
                      i === index
                        ? "w-8 bg-brand"
                        : "w-4 bg-foreground/25 hover:bg-foreground/45"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-background/92 backdrop-blur-md ff-fade-in"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-title"
        >
          <div
            className="relative w-full max-w-5xl max-h-[92svh] overflow-y-auto bg-surface border-t sm:border border-line ff-rise"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 z-10 bg-background/80 hover:bg-background text-foreground p-2 border border-line transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-6 relative aspect-[16/10] md:aspect-auto md:min-h-[28rem]">
                <PosterImage
                  src={featuredMovie.thumbnail}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              <div className="md:col-span-6 flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-12">
                <p className="text-brand text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                  Details
                </p>
                <h2
                  id="details-title"
                  className="ff-display text-foreground text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-balance pr-8"
                >
                  {featuredMovie.title}
                </h2>
                <p className="text-muted text-sm mt-4">
                  {featuredMovie.year}
                  <span className="mx-2 opacity-40">·</span>
                  {featuredMovie.duration}
                  <span className="mx-2 opacity-40">·</span>
                  {featuredMovie.genre}
                </p>
                <p className="text-foreground/80 text-base md:text-lg mt-5 leading-relaxed">
                  {featuredMovie.description}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/watch/${featuredMovie.id}`}
                    className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-[#efb56f] text-[#1a1208] px-6 py-3.5 font-semibold transition-colors"
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    Watch now
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="inline-flex items-center justify-center border border-line bg-foreground/5 hover:bg-foreground/10 text-foreground px-6 py-3.5 font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
