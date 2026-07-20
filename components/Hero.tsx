"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Info, X } from "lucide-react";
import { movies } from "@/lib/movies";
import { useEffect, useState } from "react";

export default function Hero() {
  const featuredMovie =
    movies.find((m) => m.genre === "Featured") ?? movies[0];
  const [showModal, setShowModal] = useState(false);

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

  if (!featuredMovie) return null;

  return (
    <>
      <section className="relative h-[78vh] min-h-[28rem] w-full">
        <div className="absolute inset-0">
          <Image
            src={featuredMovie.thumbnail}
            alt={featuredMovie.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </div>

        <div className="relative h-full flex flex-col justify-end md:justify-center px-4 md:px-12 lg:px-16 pb-16 md:pb-24 max-w-3xl pt-24">
          <p className="text-brand text-xs font-semibold tracking-[0.22em] uppercase mb-3">
            Featured
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight text-balance">
            {featuredMovie.title}
          </h1>
          <p className="text-base md:text-lg text-white/80 mb-3 max-w-xl line-clamp-3 leading-relaxed">
            {featuredMovie.description}
          </p>
          <p className="text-white/45 text-sm mb-7">
            {featuredMovie.year}
            <span className="mx-2">·</span>
            {featuredMovie.duration}
            <span className="mx-2">·</span>
            {featuredMovie.genre}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/watch/${featuredMovie.id}`}
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg hover:bg-white/90 transition font-semibold"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Play
            </Link>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-6 py-3 rounded-lg transition font-semibold border border-white/10 backdrop-blur-sm"
            >
              <Info className="w-5 h-5" />
              More Info
            </button>
          </div>
        </div>
      </section>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${featuredMovie.title} details`}
        >
          <div
            className="bg-zinc-950 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-52 md:h-64">
              <Image
                src={featuredMovie.thumbnail}
                alt={featuredMovie.title}
                fill
                className="object-cover rounded-t-2xl"
                sizes="(max-width: 768px) 100vw, 768px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 transition border border-white/10"
                aria-label="Close"
              >
                <X className="text-white w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-8 -mt-8 relative">
              <h2 className="text-white text-2xl md:text-4xl font-bold mb-3">
                {featuredMovie.title}
              </h2>
              <div className="flex flex-wrap gap-3 text-white/55 text-sm mb-5 items-center">
                <span>{featuredMovie.year}</span>
                <span>{featuredMovie.duration}</span>
                <span className="border border-white/25 px-1.5 py-0.5 text-xs rounded">
                  HD
                </span>
                <span>{featuredMovie.genre}</span>
              </div>
              <p className="text-white/75 text-base md:text-lg mb-8 leading-relaxed">
                {featuredMovie.description}
              </p>
              <Link
                href={`/watch/${featuredMovie.id}`}
                className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold transition"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Watch Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
