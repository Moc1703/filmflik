"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MovieRow from "@/components/MovieRow";
import { movies } from "@/lib/movies";

export default function Home() {
  return (
    <main className="bg-black min-h-screen">
      <Navbar />
      <Hero />
      <div className="space-y-8 pb-16">
        <MovieRow title="Film Populer" movies={movies} />
        <MovieRow title="Fantasi" movies={movies.filter(m => m.genre === "Fantasy")} />
        <MovieRow title="Petualangan" movies={movies.filter(m => m.genre === "Adventure")} />
        <MovieRow title="Animasi" movies={movies.filter(m => m.genre === "Animation" || m.genre === "Comedy")} />
        <MovieRow title="Dokumenter" movies={movies.filter(m => m.genre === "Documentary")} />
      </div>
    </main>
  );
}
