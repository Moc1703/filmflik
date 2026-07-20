"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MovieRow from "@/components/MovieRow";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import Footer from "@/components/Footer";
import { movies } from "@/lib/movies";

export default function Home() {
  return (
    <main className="bg-black min-h-screen">
      <Navbar />
      <Hero />
      <div className="relative z-10 -mt-10 md:-mt-16 space-y-2 pb-8">
        <ContinueWatchingRow />
        <MovieRow id="movies" title="Popular on FILMflik" movies={movies} />
        <MovieRow
          id="latest"
          title="Latest"
          movies={[...movies].sort((a, b) => b.year - a.year)}
        />
        <MovieRow
          id="genres"
          title="Featured"
          movies={movies.filter((m) => m.genre === "Featured")}
        />
      </div>
      <Footer />
    </main>
  );
}
