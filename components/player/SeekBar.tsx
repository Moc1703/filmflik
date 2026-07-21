"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

interface SeekBarProps {
  currentTime: number;
  duration: number;
  bufferRanges: { start: number; end: number }[];
  videoSrc: string;
  poster?: string;
  onSeek: (time: number) => void;
  onSeekingChange: (seeking: boolean) => void;
  onInteract: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SeekBar({
  currentTime,
  duration,
  bufferRanges,
  videoSrc,
  poster,
  onSeek,
  onSeekingChange,
  onInteract,
}: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTimeRef = useRef<number | null>(null);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverRatio, setHoverRatio] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  const ratioFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const captureFrame = useCallback(() => {
    const video = previewVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    try {
      const w = 160;
      const h = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * w)) || 90;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.7));
      setPreviewReady(true);
    } catch {
      // CORS tainted canvas — fall back to poster
      setPreviewUrl(poster || null);
      setPreviewReady(Boolean(poster));
    }
  }, [poster]);

  const schedulePreviewSeek = useCallback(
    (time: number) => {
      pendingTimeRef.current = time;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        const video = previewVideoRef.current;
        const t = pendingTimeRef.current;
        if (!video || t == null || !Number.isFinite(t)) return;
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          captureFrame();
        };
        video.addEventListener("seeked", onSeeked);
        try {
          video.currentTime = t;
        } catch {
          setPreviewUrl(poster || null);
          setPreviewReady(Boolean(poster));
        }
      }, 120);
    },
    [captureFrame, poster]
  );

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSeekingChange(true);
    onInteract();
    const track = e.currentTarget;
    track.setPointerCapture(e.pointerId);

    const apply = (clientX: number) => {
      if (!duration) return;
      const ratio = ratioFromClientX(clientX);
      const time = ratio * duration;
      setHoverRatio(ratio);
      setHoverTime(time);
      onSeek(time);
    };
    apply(e.clientX);

    const onMove = (ev: PointerEvent) => apply(ev.clientX);
    const onUp = (ev: PointerEvent) => {
      onSeekingChange(false);
      track.releasePointerCapture(ev.pointerId);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      onInteract();
    };
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const ratio = ratioFromClientX(e.clientX);
    const time = ratio * duration;
    setHoverRatio(ratio);
    setHoverTime(time);
    schedulePreviewSeek(time);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!duration) return;
    let next: number | null = null;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next = Math.min(duration, currentTime + 5);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      next = Math.max(0, currentTime - 5);
    } else if (e.key === "Home") {
      e.preventDefault();
      next = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      next = duration;
    }
    if (next != null) {
      onSeek(next);
      onInteract();
    }
  };

  return (
    <div
      ref={trackRef}
      className="group/seek relative h-5 flex items-center cursor-pointer mb-1 outline-none focus-visible:ring-2 focus-visible:ring-brand/60 rounded"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        setHoverTime(null);
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      }}
      onKeyDown={onKeyDown}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration) || 0}
      aria-valuenow={Math.floor(currentTime)}
      aria-valuetext={formatTime(currentTime)}
    >
      <video
        ref={previewVideoRef}
        src={videoSrc}
        preload="metadata"
        muted
        playsInline
        className="hidden"
        aria-hidden
      />
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {hoverTime != null && (
        <div
          className="absolute -top-2 -translate-x-1/2 -translate-y-full pointer-events-none z-10 flex flex-col items-center gap-1.5"
          style={{ left: `${hoverRatio * 100}%` }}
        >
          {(previewReady && previewUrl) || poster ? (
            <div className="overflow-hidden border border-line bg-background w-[9rem] aspect-video relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || poster}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
          <span className="bg-background/95 text-foreground text-xs font-medium px-2 py-1 tabular-nums border border-line">
            {formatTime(hoverTime)}
          </span>
        </div>
      )}

      <div className="relative w-full h-1 group-hover/seek:h-1.5 transition-all rounded-full bg-white/25 overflow-hidden">
        {duration > 0 &&
          bufferRanges.map((range, i) => (
            <div
              key={`${range.start}-${range.end}-${i}`}
              className="absolute inset-y-0 bg-white/35 rounded-full"
              style={{
                left: `${(range.start / duration) * 100}%`,
                width: `${((range.end - range.start) / duration) * 100}%`,
              }}
            />
          ))}
        <div
          className="absolute inset-y-0 left-0 bg-brand rounded-full"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-brand rounded-full shadow-md scale-0 group-hover/seek:scale-100 group-focus-visible/seek:scale-100 transition-transform ring-2 ring-white/30 pointer-events-none"
        style={{ left: `calc(${progressRatio * 100}% - 7px)` }}
      />
    </div>
  );
}
