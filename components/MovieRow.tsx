"use client";

import Link from "next/link";
import { Movie } from "@/lib/movies";

interface MovieRowProps {
  title: string;
  movies: Movie[];
}

export default function MovieRow({ title, movies }: MovieRowProps) {
  return (
    <div className="px-4 md:px-16 mb-8">
      <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {movies.map((movie) => (
          <Link
            key={movie.id}
            href={`/watch/${movie.id}`}
            className="group relative cursor-pointer transition-transform duration-300 hover:scale-105"
          >
            <img
              src={movie.thumbnail}
              alt={movie.title}
              className="w-full rounded-lg"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center p-4">
              <h3 className="text-white text-lg font-semibold text-center mb-2">
                {movie.title}
              </h3>
              <p className="text-gray-300 text-sm text-center line-clamp-2">
                {movie.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
