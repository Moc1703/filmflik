import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-12 lg:px-16 py-14 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <Link
              href="/"
              className="ff-display text-2xl font-extrabold tracking-tight text-foreground"
            >
              FILM<span className="text-brand">flik</span>
            </Link>
            <p className="text-muted text-sm mt-3 max-w-sm leading-relaxed">
              A quiet room for films — curated titles, protected streams, and a
              player built for focus.
            </p>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm text-muted" aria-label="Footer">
            <Link
              href="/categories"
              className="hover:text-foreground transition-colors"
            >
              Categories
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          </nav>
        </div>
        <p className="text-muted/60 text-xs mt-10">
          © {new Date().getFullYear()} FILMflik
        </p>
      </div>
    </footer>
  );
}
