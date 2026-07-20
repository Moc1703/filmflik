import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
      <p className="text-brand text-sm font-semibold tracking-widest uppercase mb-3">
        404
      </p>
      <h1 className="text-white text-3xl md:text-4xl font-bold mb-3">
        Page not found
      </h1>
      <p className="text-gray-400 mb-8 max-w-md">
        The page or movie you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="bg-brand hover:bg-red-700 text-white px-6 py-3 rounded font-semibold transition"
      >
        Back to Home
      </Link>
    </main>
  );
}
