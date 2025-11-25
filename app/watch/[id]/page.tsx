"use client";

import { useParams, useRouter } from "next/navigation";
import { getMovieById } from "@/lib/movies";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const movie = getMovieById(params.id as string);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!movie) {
      router.push("/");
    }
  }, [movie, router]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePause = () => {
      // Set timer untuk 30 detik
      pauseTimerRef.current = setTimeout(() => {
        setShowInfo(true);
      }, 30000);
    };

    const handlePlay = () => {
      // Clear timer jika video di-play lagi
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      setShowInfo(false);
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const lockOrientation = async () => {
      if (!isPlaying) return;

      try {
        const screenOrientation = screen.orientation as any;
        if (screenOrientation && screenOrientation.lock) {
          await screenOrientation.lock("landscape").catch(() => {
            // Fallback: tidak semua browser support
          });
        }
      } catch (error) {
        console.log("Orientation lock not supported");
      }
    };

    const unlockOrientation = () => {
      try {
        const screenOrientation = screen.orientation as any;
        if (screenOrientation && screenOrientation.unlock) {
          screenOrientation.unlock();
        }
      } catch (error) {
        console.log("Orientation unlock not supported");
      }
    };

    if (isPlaying) {
      lockOrientation();
    }

    return () => {
      unlockOrientation();
    };
  }, [isPlaying]);

  if (!movie) {
    return null;
  }

  return (
    <div className="bg-black h-screen w-screen overflow-hidden fixed inset-0">
      <button
        onClick={() => router.push("/")}
        className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Kembali
      </button>

      <div className="w-full h-full flex items-center justify-center">
        {!isPlaying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <div className="text-center mb-8">
              <h1 className="text-white text-3xl md:text-4xl font-bold mb-4">
                {movie.title}
              </h1>
              <div className="flex gap-4 text-gray-400 justify-center mb-4">
                <span>{movie.year}</span>
                <span>•</span>
                <span>{movie.duration}</span>
                <span>•</span>
                <span>{movie.genre}</span>
              </div>
              <p className="text-gray-300 text-lg max-w-2xl px-4">
                {movie.description}
              </p>
            </div>
            <button
              onClick={() => setIsPlaying(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-xl font-semibold transition"
            >
              ▶ Putar Film
            </button>
          </div>
        )}
        
        {isPlaying && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              controlsList="nodownload"
              onEnded={() => setIsPlaying(false)}
            >
              <source src={movie.videoUrl} type="video/mp4" />
              {movie.subtitleUrl && (
                <track
                  kind="subtitles"
                  src={movie.subtitleUrl}
                  srcLang="id"
                  label="Bahasa Indonesia"
                  default
                />
              )}
              Browser Anda tidak mendukung pemutar video.
            </video>

            {showInfo && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 pointer-events-none">
                <div className="text-center max-w-3xl px-8">
                  <h2 className="text-white text-4xl md:text-5xl font-bold mb-6">
                    {movie.title}
                  </h2>
                  <div className="flex gap-4 text-gray-300 justify-center mb-6 text-lg">
                    <span>{movie.year}</span>
                    <span>•</span>
                    <span>{movie.duration}</span>
                    <span>•</span>
                    <span>{movie.genre}</span>
                  </div>
                  <p className="text-gray-200 text-xl leading-relaxed">
                    {movie.description}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
