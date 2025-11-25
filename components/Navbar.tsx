"use client";

import Link from "next/link";
import { Search, Bell, User, X } from "lucide-react";
import { useState } from "react";
import { movies } from "@/lib/movies";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const filteredMovies = searchQuery
    ? movies.filter((movie) =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black to-transparent">
      <div className="flex items-center justify-between px-4 md:px-16 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-red-600 text-2xl md:text-3xl font-bold">
            FILMKU
          </Link>
          <div className="hidden md:flex gap-6">
            <Link href="/" className="text-white hover:text-gray-300 transition">
              Beranda
            </Link>
            <Link href="/" className="text-white hover:text-gray-300 transition">
              Film
            </Link>
            <Link href="/" className="text-white hover:text-gray-300 transition">
              Terbaru
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Search
            className="text-white w-5 h-5 cursor-pointer hover:text-gray-300"
            onClick={() => setShowSearch(!showSearch)}
          />
          <Bell className="text-white w-5 h-5 cursor-pointer hover:text-gray-300" />
          <User className="text-white w-6 h-6 cursor-pointer hover:text-gray-300" />
        </div>
      </div>

      {showSearch && (
        <div className="absolute top-full left-0 w-full bg-black/95 backdrop-blur-lg p-4 md:px-16">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Cari film..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-red-600"
              autoFocus
            />
            <X
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 cursor-pointer hover:text-white"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
            />
          </div>

          {searchQuery && (
            <div className="max-w-2xl mx-auto mt-4 bg-gray-900 rounded-lg max-h-96 overflow-y-auto">
              {filteredMovies.length > 0 ? (
                filteredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex items-center gap-4 p-3 hover:bg-gray-800 cursor-pointer transition"
                    onClick={() => {
                      router.push(`/watch/${movie.id}`);
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                  >
                    <img
                      src={movie.thumbnail}
                      alt={movie.title}
                      className="w-20 h-12 object-cover rounded"
                    />
                    <div>
                      <h3 className="text-white font-semibold">{movie.title}</h3>
                      <p className="text-gray-400 text-sm">
                        {movie.year} • {movie.genre}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">
                  Tidak ada film yang ditemukan
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
