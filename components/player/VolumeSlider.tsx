"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";

interface VolumeSliderProps {
  volume: number;
  muted: boolean;
  onChange: (value: number) => void;
  onToggleMute: () => void;
}

export default function VolumeSlider({
  volume,
  muted,
  onChange,
  onToggleMute,
}: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const level = muted ? 0 : volume;
  const percent = Math.round(level * 100);

  const VolumeIcon =
    muted || level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;

  const applyFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(ratio);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const track = e.currentTarget;
    track.setPointerCapture(e.pointerId);
    applyFromClientX(e.clientX);

    const onMove = (ev: PointerEvent) => applyFromClientX(ev.clientX);
    const onUp = (ev: PointerEvent) => {
      track.releasePointerCapture(ev.pointerId);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
    };

    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(1, level + 0.05));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(0, level - 0.05));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(1);
    } else if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      onToggleMute();
    }
  };

  return (
    <div className="ff-volume group/vol flex items-center gap-0.5">
      <button
        type="button"
        className="ff-icon-btn"
        onClick={onToggleMute}
        aria-label={muted || level === 0 ? "Unmute" : "Mute"}
        title={muted || level === 0 ? "Unmute (M)" : "Mute (M)"}
      >
        <VolumeIcon className="w-5 h-5" />
      </button>

      <div
        ref={trackRef}
        className="ff-volume-track"
        role="slider"
        tabIndex={0}
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <div className="ff-volume-rail">
          <div
            className="ff-volume-fill"
            style={{ width: `${percent}%` }}
          />
          <div
            className="ff-volume-thumb"
            style={{ left: `${percent}%` }}
          />
        </div>
        <span
          className="ff-volume-tooltip"
          style={{ left: `${percent}%` }}
          aria-hidden
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}
