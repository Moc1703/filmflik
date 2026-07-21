"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PosterImage from "@/components/PosterImage";
import {
  applyAutoLevelCap,
  getPreviewAbrHint,
  getPreviewMp4Ladder,
} from "@/lib/network-quality";

let activePreviewId: string | null = null;
const previewListeners = new Set<(id: string | null) => void>();

function setActivePreview(id: string | null) {
  activePreviewId = id;
  for (const listener of previewListeners) listener(id);
}

function allowHoverPreview(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return !window.matchMedia("(hover: none)").matches;
}

type CatalogHoverPreviewProps = {
  movieId: string;
  thumbnail?: string | null;
  alt?: string;
  /** Delay before muted preview starts (default 2s). */
  hoverDelayMs?: number;
  /**
   * If set, play the muted preview for this long then return to the thumbnail.
   * Omit to loop until hover ends (catalog default).
   */
  previewDurationMs?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  videoClassName?: string;
};

/**
 * Catalog poster with muted video preview after a long hover.
 * Hero / other sections should keep static thumbnails.
 */
export default function CatalogHoverPreview({
  movieId,
  thumbnail,
  alt = "",
  hoverDelayMs = 2000,
  previewDurationMs,
  className = "object-cover",
  sizes,
  priority,
  videoClassName = "object-cover",
}: CatalogHoverPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const sessionRef = useRef(0);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hot, setHot] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [webpOk, setWebpOk] = useState(true);

  const playlistUrl = `/api/media/${encodeURIComponent(movieId)}/playlist.m3u8`;
  const webpSrc = `/api/media/${encodeURIComponent(movieId)}/preview.webp`;
  const timedPreview =
    typeof previewDurationMs === "number" && previewDurationMs > 0;

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const clearDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearTimeout(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    clearDurationTimer();
    destroyHls();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    setHot(false);
    setVideoReady(false);
    setWebpOk(true);
    if (activePreviewId === movieId) setActivePreview(null);
  }, [clearDurationTimer, destroyHls, movieId]);

  const start = useCallback(() => {
    if (!allowHoverPreview()) return;
    setActivePreview(movieId);
    sessionRef.current += 1;
    clearDurationTimer();
    setWebpOk(true);
    setVideoReady(false);
    setHot(true);
  }, [clearDurationTimer, movieId]);

  useEffect(() => {
    if (!hot || !videoReady || !timedPreview) return;
    clearDurationTimer();
    durationTimerRef.current = setTimeout(() => {
      stop();
    }, previewDurationMs);
    return () => clearDurationTimer();
  }, [
    clearDurationTimer,
    hot,
    previewDurationMs,
    stop,
    timedPreview,
    videoReady,
  ]);

  useEffect(() => {
    if (!hot) return;
    const video = videoRef.current;
    if (!video) return;

    const session = sessionRef.current;
    let cancelled = false;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = !timedPreview;
    video.setAttribute("muted", "");

    const markPlaying = () => {
      if (cancelled || session !== sessionRef.current) return;
      void video.play().then(
        () => {
          if (!cancelled && session === sessionRef.current) {
            setVideoReady(true);
          }
        },
        () => {
          /* autoplay blocked */
        }
      );
    };

    const playMp4Ladder = () => {
      const ladder = getPreviewMp4Ladder(movieId);
      let index = 0;

      const tryNext = () => {
        if (cancelled || session !== sessionRef.current) return;
        if (index >= ladder.length) return;
        const url = ladder[index++];
        video.src = url;
        const onReady = () => {
          video.removeEventListener("error", onError);
          markPlaying();
        };
        const onError = () => {
          video.removeEventListener("loadeddata", onReady);
          tryNext();
        };
        video.addEventListener("loadeddata", onReady, { once: true });
        video.addEventListener("error", onError, { once: true });
        video.load();
      };

      tryNext();
    };

    void (async () => {
      destroyHls();

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playlistUrl;
        video.addEventListener("loadeddata", markPlaying, { once: true });
        video.addEventListener("error", () => playMp4Ladder(), { once: true });
        video.load();
        return;
      }

      try {
        const Hls = (await import("hls.js")).default;
        if (cancelled || session !== sessionRef.current) return;
        if (!Hls.isSupported()) {
          playMp4Ladder();
          return;
        }

        const hint = getPreviewAbrHint();
        const hls = new Hls({
          enableWorker: true,
          startLevel: hint.startLevel,
          abrEwmaDefaultEstimate: hint.abrEwmaDefaultEstimate,
          abrBandWidthFactor: 0.85,
          abrBandWidthUpFactor: 0.7,
          capLevelToPlayerSize: true,
          maxBufferLength: 12,
          maxMaxBufferLength: 24,
          maxBufferSize: 12 * 1000 * 1000,
        });
        hlsRef.current = hls;
        hls.loadSource(playlistUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (cancelled || session !== sessionRef.current) return;
          const cap = applyAutoLevelCap(
            data.levels.map((l) => ({ height: l.height || 0 })),
            hint.maxHeight
          );
          if (cap >= 0) hls.autoLevelCapping = cap;
          hls.nextLevel = -1;
          markPlaying();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || cancelled) return;
          destroyHls();
          playMp4Ladder();
        });
      } catch {
        if (!cancelled) playMp4Ladder();
      }
    })();

    return () => {
      cancelled = true;
      destroyHls();
    };
  }, [destroyHls, hot, movieId, playlistUrl, timedPreview]);

  useEffect(() => {
    const onActive = (id: string | null) => {
      if (id && id !== movieId) stop();
    };
    previewListeners.add(onActive);
    return () => {
      previewListeners.delete(onActive);
    };
  }, [movieId, stop]);

  useEffect(() => () => stop(), [stop]);

  const onEnter = () => {
    if (!allowHoverPreview()) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => start(), hoverDelayMs);
  };

  const onLeave = () => {
    stop();
  };

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <PosterImage
        src={thumbnail}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`${className} transition-opacity duration-300 ${
          hot && videoReady ? "opacity-0" : "opacity-100"
        }`}
      />

      {hot && webpOk && !videoReady ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={webpSrc}
          alt=""
          className={`pointer-events-none absolute inset-0 h-full w-full ${videoClassName} transition-opacity duration-300 opacity-100`}
          onError={() => setWebpOk(false)}
        />
      ) : null}

      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        aria-hidden
        tabIndex={-1}
        className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300 ${videoClassName} ${
          hot && videoReady ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
