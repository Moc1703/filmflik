import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-white/10 px-4 md:px-12 lg:px-16 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <Link
            href="/"
            className="text-brand text-xl font-bold tracking-tight"
          >
            FILM<span className="text-white font-semibold">flik</span>
          </Link>
          <p className="text-white/40 text-sm mt-2 max-w-sm">
            Watch curated films with a custom player. Built for smooth playback
            and a clean browsing experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-white/50">
          <a href="#movies" className="hover:text-white transition">
            Movies
          </a>
          <a href="#latest" className="hover:text-white transition">
            Latest
          </a>
          <a href="#genres" className="hover:text-white transition">
            Genres
          </a>
        </div>
      </div>
      <p className="text-white/25 text-xs mt-8">
        © {new Date().getFullYear()} FILMflik
      </p>
    </footer>
  );
}
