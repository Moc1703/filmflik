"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Catalog from "@/components/Catalog";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import MoodRecommendations from "@/components/MoodRecommendations";
import Footer from "@/components/Footer";
import { useCatalog } from "@/lib/use-catalog";

export default function Home() {
  const { movies, loading } = useCatalog();

  return (
    <main className="ff-atmosphere min-h-screen">
      <Navbar movies={movies} />
      <Hero movies={movies} loading={loading} />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16">
        <div className="flex flex-col gap-16 md:gap-24 pt-14 md:pt-20 pb-8 md:pb-12">
          <ContinueWatchingRow movies={movies} />
          {!loading && <MoodRecommendations movies={movies} />}
          {!loading && <Catalog movies={movies} />}
        </div>
      </div>
      <Footer />
    </main>
  );
}
