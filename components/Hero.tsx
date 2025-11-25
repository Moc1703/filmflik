"use client";

import Link from "next/link";
import { Play, Info, X } from "lucide-react";
import { movies } from "@/lib/movies";
import { useState } from "react";

export default function Hero() {
  const featuredMovie = movies[0];
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative h-[80vh] w-full">
        <div className="absolute inset-0">
          <img
            src={featuredMovie.thumbnail}
            alt={featuredMovie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="relative h-full flex flex-col justify-center px-4 md:px-16 max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            {featuredMovie.title}
          </h1>
          <p className="text-lg md:text-xl text-white mb-6 line-clamp-3">
            {featuredMovie.description}
          </p>
          <div className="flex gap-4">
            <Link
              href={`/watch/${featuredMovie.id}`}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded hover:bg-gray-200 transition font-semibold"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Putar
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-gray-500/70 text-white px-6 py-3 rounded hover:bg-gray-500/50 transition font-semibold"
            >
              <Info className="w-5 h-5" />
              Info Lebih
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img
                src={featuredMovie.thumbnail}
                alt={featuredMovie.title}
                className="w-full h-64 object-cover rounded-t-lg"
              />
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 rounded-full p-2 transition"
              >
                <X className="text-white w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">
                {featuredMovie.title}
              </h2>

              <div className="flex gap-4 text-gray-300 mb-6">
                <span className="text-green-500 font-semibold">
                  {Math.floor(Math.random() * 30) + 70}% Match
                </span>
                <span>{featuredMovie.year}</span>
                <span>{featuredMovie.duration}</span>
                <span className="border border-gray-500 px-2">HD</span>
              </div>

              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                {featuredMovie.description}
              </p>

              <div className="space-y-4 text-gray-300">
                <div>
                  <span className="text-gray-500">Genre: </span>
                  <span>{featuredMovie.genre}</span>
                </div>
                <div>
                  <span className="text-gray-500">Durasi: </span>
                  <span>{featuredMovie.duration}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tahun: </span>
                  <span>{featuredMovie.year}</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={`/watch/${featuredMovie.id}`}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-semibold transition w-full md:w-auto"
                >
                  <Play className="w-5 h-5" fill="currentColor" />
                  Tonton Sekarang
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
