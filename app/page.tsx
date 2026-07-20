"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MovieRow from "@/components/MovieRow";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import Footer from "@/components/Footer";
import { movies } from "@/lib/movies";

const latestMovies = [...movies].sort((a, b) => b.year - a.year);

const genreRows: { title: string; genre: string | string[] }[] = [
  { title: "Fantasy", genre: "Fantasy" },
  { title: "Comedy", genre: "Comedy" },
  { title: "Sci-Fi", genre: "Sci-Fi" },
];

function byGenre(genre: string | string[]) {
  const list = Array.isArray(genre) ? genre : [genre];
  return movies.filter((m) => list.includes(m.genre));
}

export default function Home() {
  return (
    <main className="bg-black min-h-screen">
      <Navbar />
      <Hero />
      <div className="relative z-10 -mt-10 md:-mt-16 space-y-2 pb-8">
        <ContinueWatchingRow />
        <MovieRow id="movies" title="Popular on FILMflik" movies={movies} />
        <MovieRow id="latest" title="Latest" movies={latestMovies} />
        <div id="genres" className="scroll-mt-24 space-y-2">
          {genreRows.map((row) => (
            <MovieRow
              key={row.title}
              title={row.title}
              movies={byGenre(row.genre)}
            />
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
