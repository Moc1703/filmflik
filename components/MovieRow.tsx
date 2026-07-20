"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Movie } from "@/lib/movies";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  id?: string;
}

export default function MovieRow({ title, movies, id }: MovieRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [movies]);

  if (movies.length === 0) return null;

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 720), behavior: "smooth" });
  };

  return (
    <section id={id} className="group/row relative mb-8 md:mb-10 scroll-mt-24">
      <div className="px-4 md:px-12 lg:px-16 mb-3 md:mb-4 flex items-end justify-between gap-4">
        <h2 className="text-white text-lg md:text-2xl font-semibold tracking-tight">
          {title}
        </h2>
      </div>

      <div className="relative">
        {canLeft && (
          <button
            type="button"
            className="hidden md:flex absolute left-1 top-0 bottom-0 z-20 w-10 items-center justify-center bg-black/50 hover:bg-black/80 text-white transition opacity-0 group-hover/row:opacity-100"
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            className="hidden md:flex absolute right-1 top-0 bottom-0 z-20 w-10 items-center justify-center bg-black/50 hover:bg-black/80 text-white transition opacity-0 group-hover/row:opacity-100"
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        <div
          ref={scrollerRef}
          className="flex gap-3 md:gap-4 overflow-x-auto px-4 md:px-12 lg:px-16 pb-2 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {movies.map((movie) => (
            <Link
              key={movie.id}
              href={`/watch/${movie.id}`}
              className="group relative shrink-0 w-[42vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] max-w-[280px] aspect-video snap-start rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-white/5 hover:ring-white/20 transition"
            >
              <Image
                src={movie.thumbnail}
                alt={movie.title}
                fill
                className="object-cover transition duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 42vw, (max-width: 768px) 28vw, 22vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-x-0 bottom-0 p-3 translate-y-1 md:translate-y-2 md:group-hover:translate-y-0 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shrink-0">
                    <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
                  </span>
                  <h3 className="text-white text-sm font-semibold truncate">
                    {movie.title}
                  </h3>
                </div>
                <p className="text-white/50 text-xs truncate">
                  {movie.year} · {movie.genre}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
