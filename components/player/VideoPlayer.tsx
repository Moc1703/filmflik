"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  Captions,
  CaptionsOff,
  Home,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Settings,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import {
  clearWatchProgress,
  getPlayerPrefs,
  patchPlayerPrefs,
  saveWatchProgress,
} from "@/lib/player-storage";
import { getMediaErrorMessage } from "@/lib/media-error";
import VolumeSlider from "@/components/player/VolumeSlider";
import SeekBar from "@/components/player/SeekBar";
import KeyboardHelp from "@/components/player/KeyboardHelp";

export interface VideoPlayerProps {
  src: string;
  title: string;
  movieId?: string;
  subtitleUrl?: string;
  poster?: string;
  meta?: string;
  /** Start playback from this time (seconds). */
  startAt?: number;
  onBack?: () => void;
  pauseInfoDelayMs?: number;
  infoOverlay?: ReactNode;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type SettingsTab = "speed" | "captions" | "general" | null;

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

export default function VideoPlayer({
  src,
  title,
  movieId,
  subtitleUrl,
  poster,
  meta,
  startAt = 0,
  onBack,
  pauseInfoDelayMs = 30000,
  infoOverlay,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseInfoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startAppliedRef = useRef(false);
  const volumeBeforeMuteRef = useRef(1);

  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferRanges, setBufferRanges] = useState<{ start: number; end: number }[]>(
    []
  );
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [subtitlesOn, setSubtitlesOn] = useState(Boolean(subtitleUrl));
  const [showPauseInfo, setShowPauseInfo] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(null);
  const [skipFlash, setSkipFlash] = useState<"back" | "fwd" | null>(null);
  const [pipSupported, setPipSupported] = useState(false);
  const [inPip, setInPip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadToken, setLoadToken] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [pauseInfoEnabled, setPauseInfoEnabled] = useState(true);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    if (
      !videoRef.current ||
      videoRef.current.paused ||
      settingsTab ||
      showHelp
    ) {
      setShowControls(true);
      return;
    }
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
      setSettingsTab(null);
    }, 2800);
  }, [settingsTab, showHelp]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const persistPrefs = useCallback((nextVolume: number, nextMuted: boolean) => {
    patchPlayerPrefs({ volume: nextVolume, muted: nextMuted });
  }, []);

  const queueProgressSave = useCallback(
    (time: number, dur: number) => {
      if (!movieId) return;
      if (progressSaveRef.current) clearTimeout(progressSaveRef.current);
      progressSaveRef.current = setTimeout(() => {
        saveWatchProgress(movieId, time, dur);
      }, 800);
    },
    [movieId]
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || error) return;
    if (video.paused || video.ended) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [error]);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(
      Math.max(0, video.currentTime + delta),
      video.duration
    );
    setSkipFlash(delta < 0 ? "back" : "fwd");
    if (skipFlashTimerRef.current) clearTimeout(skipFlashTimerRef.current);
    skipFlashTimerRef.current = setTimeout(() => setSkipFlash(null), 550);
  }, []);

  const setVideoTime = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(0, time), video.duration);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.muted && video.volume > 0) {
      volumeBeforeMuteRef.current = video.volume;
      video.muted = true;
      setMuted(true);
      persistPrefs(video.volume, true);
    } else {
      video.muted = false;
      if (video.volume === 0) {
        video.volume = volumeBeforeMuteRef.current || 0.5;
      }
      setMuted(false);
      setVolume(video.volume);
      persistPrefs(video.volume, false);
    }
  }, [persistPrefs]);

  const changeVolume = useCallback(
    (value: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = Math.min(1, Math.max(0, value));
      video.volume = next;
      video.muted = next === 0;
      if (next > 0) volumeBeforeMuteRef.current = next;
      setVolume(next);
      setMuted(video.muted);
      persistPrefs(next, video.muted);
    },
    [persistPrefs]
  );

  const setSpeed = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else {
          const webkit = video as HTMLVideoElement & {
            webkitEnterFullscreen?: () => void;
          };
          webkit.webkitEnterFullscreen?.();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      const webkit = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      };
      try {
        webkit.webkitEnterFullscreen?.();
      } catch {
        // blocked
      }
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // blocked
    }
  }, []);

  const toggleSubtitles = useCallback(() => {
    if (!subtitleUrl) return;
    setSubtitlesOn((prev) => !prev);
  }, [subtitleUrl]);

  const replay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setEnded(false);
    video.currentTime = 0;
    if (movieId) clearWatchProgress(movieId);
    void video.play().catch(() => undefined);
  }, [movieId]);

  const retryLoad = useCallback(() => {
    setError(null);
    setEnded(false);
    setBuffering(true);
    startAppliedRef.current = false;
    setLoadToken((t) => t + 1);
  }, []);

  const syncBufferRanges = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const ranges: { start: number; end: number }[] = [];
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({
        start: video.buffered.start(i),
        end: video.buffered.end(i),
      });
    }
    setBufferRanges(ranges);
  }, []);

  // Load prefs once
  useEffect(() => {
    const prefs = getPlayerPrefs();
    setVolume(prefs.volume);
    setMuted(prefs.muted);
    setPauseInfoEnabled(prefs.pauseInfoEnabled);
    volumeBeforeMuteRef.current = prefs.volume > 0 ? prefs.volume : 1;
    setPipSupported(
      typeof document !== "undefined" &&
        "pictureInPictureEnabled" in document &&
        Boolean(document.pictureInPictureEnabled)
    );
  }, []);

  // Reset resume apply when source / start position changes
  useEffect(() => {
    startAppliedRef.current = false;
  }, [src, startAt, loadToken]);

  // Apply prefs + autoplay when video mounts / retries
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const prefs = getPlayerPrefs();
    video.volume = prefs.volume;
    video.muted = prefs.muted;
    setError(null);
    void video.play().catch(() => setShowControls(true));
  }, [loadToken, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = subtitlesOn ? "showing" : "hidden";
    }
  }, [subtitlesOn, subtitleUrl, loadToken]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setPlaying(true);
      setEnded(false);
      setShowPauseInfo(false);
      setError(null);
      if (pauseInfoTimerRef.current) {
        clearTimeout(pauseInfoTimerRef.current);
        pauseInfoTimerRef.current = null;
      }
      scheduleHideControls();
    };

    const onPause = () => {
      setPlaying(false);
      setShowControls(true);
      clearHideTimer();
      if (movieId && Number.isFinite(video.currentTime)) {
        saveWatchProgress(movieId, video.currentTime, video.duration || 0);
      }
      if (
        pauseInfoEnabled &&
        pauseInfoDelayMs > 0 &&
        !video.ended &&
        !error
      ) {
        pauseInfoTimerRef.current = setTimeout(() => {
          setShowPauseInfo(true);
        }, pauseInfoDelayMs);
      }
    };

    const onTimeUpdate = () => {
      if (!seeking) setCurrentTime(video.currentTime);
      queueProgressSave(video.currentTime, video.duration || 0);
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setVolume(video.volume);
      setMuted(video.muted);
      setPlaybackRate(video.playbackRate);
      if (!startAppliedRef.current && startAt > 0 && startAt < video.duration) {
        video.currentTime = startAt;
        setCurrentTime(startAt);
        startAppliedRef.current = true;
      }
    };

    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => syncBufferRanges();
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => {
      setBuffering(false);
      setError(null);
    };
    const onCanPlay = () => setBuffering(false);

    const onEnded = () => {
      setPlaying(false);
      setEnded(true);
      setShowControls(true);
      setShowPauseInfo(false);
      if (movieId) clearWatchProgress(movieId);
    };

    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    const onError = () => {
      setBuffering(false);
      setPlaying(false);
      setError(getMediaErrorMessage(video));
      setShowControls(true);
    };

    const onEnterPip = () => setInPip(true);
    const onLeavePip = () => setInPip(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("ended", onEnded);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("error", onError);
    video.addEventListener("enterpictureinpicture", onEnterPip);
    video.addEventListener("leavepictureinpicture", onLeavePip);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("error", onError);
      video.removeEventListener("enterpictureinpicture", onEnterPip);
      video.removeEventListener("leavepictureinpicture", onLeavePip);
      clearHideTimer();
      if (pauseInfoTimerRef.current) clearTimeout(pauseInfoTimerRef.current);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      if (skipFlashTimerRef.current) clearTimeout(skipFlashTimerRef.current);
      if (progressSaveRef.current) clearTimeout(progressSaveRef.current);
      if (movieId && Number.isFinite(video.currentTime)) {
        saveWatchProgress(movieId, video.currentTime, video.duration || 0);
      }
    };
  }, [
    error,
    movieId,
    pauseInfoDelayMs,
    pauseInfoEnabled,
    queueProgressSave,
    scheduleHideControls,
    seeking,
    startAt,
    syncBufferRanges,
    loadToken,
  ]);

  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreen(active);
      if (active) {
        containerRef.current?.focus();
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Focus trap while fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const root = containerRef.current;
    if (!root) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusable).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  // Media Session (lock screen / headset controls)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const video = videoRef.current;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: "FILMflik",
      album: meta || "Movies",
      artwork: poster
        ? [
            { src: poster, sizes: "512x512", type: "image/jpeg" },
            { src: poster, sizes: "256x256", type: "image/jpeg" },
          ]
        : [],
    });

    navigator.mediaSession.playbackState = ended
      ? "none"
      : playing
        ? "playing"
        : "paused";

    const bind = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // unsupported action
      }
    };

    bind("play", () => {
      void video?.play();
    });
    bind("pause", () => {
      video?.pause();
    });
    bind("seekbackward", (d) => {
      seekBy(-(d.seekOffset || 10));
    });
    bind("seekforward", (d) => {
      seekBy(d.seekOffset || 10);
    });
    bind("seekto", (d) => {
      if (typeof d.seekTime === "number") setVideoTime(d.seekTime);
    });

    return () => {
      bind("play", null);
      bind("pause", null);
      bind("seekbackward", null);
      bind("seekforward", null);
      bind("seekto", null);
    };
  }, [ended, meta, playing, poster, seekBy, setVideoTime, title]);

  // Close settings on outside click
  useEffect(() => {
    if (!settingsTab) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-settings-panel]") &&
        !target.closest("[data-settings-btn]")
      ) {
        setSettingsTab(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [settingsTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!containerRef.current?.isConnected) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          revealControls();
          break;
        case "j":
        case "arrowleft":
          e.preventDefault();
          seekBy(-10);
          revealControls();
          break;
        case "l":
        case "arrowright":
          e.preventDefault();
          seekBy(10);
          revealControls();
          break;
        case "arrowup":
          e.preventDefault();
          changeVolume(Math.min(1, (muted ? 0 : volume) + 0.05));
          revealControls();
          break;
        case "arrowdown":
          e.preventDefault();
          changeVolume(Math.max(0, (muted ? 0 : volume) - 0.05));
          revealControls();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          revealControls();
          break;
        case "f":
          e.preventDefault();
          void toggleFullscreen();
          revealControls();
          break;
        case "c":
          if (subtitleUrl) {
            e.preventDefault();
            toggleSubtitles();
            revealControls();
          }
          break;
        case "p":
          e.preventDefault();
          void togglePip();
          revealControls();
          break;
        case "<":
        case ",": {
          e.preventDefault();
          const idx = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
          const next = SPEEDS[Math.max(0, (idx === -1 ? 2 : idx) - 1)];
          setSpeed(next);
          revealControls();
          break;
        }
        case ">":
        case ".": {
          e.preventDefault();
          const idx = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
          const next =
            SPEEDS[Math.min(SPEEDS.length - 1, (idx === -1 ? 2 : idx) + 1)];
          setSpeed(next);
          revealControls();
          break;
        }
        case "escape":
          if (showHelp) {
            setShowHelp(false);
            break;
          }
          setSettingsTab(null);
          break;
        case "?":
          e.preventDefault();
          setShowHelp((v) => !v);
          setShowControls(true);
          break;
        default:
          if (/^[0-9]$/.test(e.key) && duration > 0) {
            e.preventDefault();
            setVideoTime((Number(e.key) / 10) * duration);
            revealControls();
          }
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    changeVolume,
    duration,
    muted,
    playbackRate,
    revealControls,
    seekBy,
    setSpeed,
    setVideoTime,
    showHelp,
    subtitleUrl,
    toggleFullscreen,
    toggleMute,
    togglePip,
    togglePlay,
    toggleSubtitles,
    volume,
  ]);

  const handleSurfaceClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-controls]")) return;
    if (error) return;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      togglePlay();
      revealControls();
    }, 220);
  };

  const handleSurfaceDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-controls]")) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const ratio = (e.clientX - rect.left) / rect.width;
      if (ratio < 0.28) {
        seekBy(-10);
        revealControls();
        return;
      }
      if (ratio > 0.72) {
        seekBy(10);
        revealControls();
        return;
      }
    }
    void toggleFullscreen();
  };

  const showChrome =
    showControls ||
    !playing ||
    ended ||
    Boolean(settingsTab) ||
    Boolean(error) ||
    showHelp;

  return (
    <div
      ref={containerRef}
      className={`ff-player relative w-full h-full bg-black outline-none select-none ${
        showChrome ? "cursor-default" : "cursor-none"
      }`}
      tabIndex={0}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (playing && !settingsTab && !showHelp) {
          clearHideTimer();
          hideTimerRef.current = setTimeout(() => setShowControls(false), 600);
        }
      }}
      onClick={handleSurfaceClick}
      onDoubleClick={handleSurfaceDoubleClick}
      role="region"
      aria-label={`Video player: ${title}`}
    >
      <video
        key={`${src}-${loadToken}`}
        ref={videoRef}
        className="w-full h-full object-contain"
        src={src}
        poster={poster}
        playsInline
        preload="auto"
        onContextMenu={(e) => e.preventDefault()}
      >
        {subtitleUrl && (
          <track
            kind="subtitles"
            src={subtitleUrl}
            srcLang="id"
            label="Indonesian"
            default={subtitlesOn}
          />
        )}
      </video>

      {/* Keyboard help */}
      <KeyboardHelp open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Error */}
      {error && (
        <div
          data-controls
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 px-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertCircle className="w-12 h-12 text-brand mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">
            Playback error
          </h3>
          <p className="text-white/60 max-w-md mb-8 text-sm md:text-base">
            {error}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={retryLoad}
              className="inline-flex items-center gap-2 bg-brand hover:bg-red-600 text-white px-5 py-2.5 rounded-lg font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 rounded-lg font-semibold transition border border-white/10"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </button>
            )}
          </div>
        </div>
      )}

      {/* Buffering */}
      {buffering && playing && !error && (
        <div className="absolute inset-0 z-[15] flex items-center justify-center pointer-events-none">
          <div className="ff-spinner" />
        </div>
      )}

      {/* Skip flash */}
      {skipFlash && !error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            className={`flex items-center gap-2 rounded-full bg-black/55 backdrop-blur-md px-5 py-3 text-white text-sm font-medium ${
              skipFlash === "back" ? "mr-auto ml-[12%]" : "ml-auto mr-[12%]"
            }`}
          >
            {skipFlash === "back" ? (
              <>
                <SkipBack className="w-5 h-5" />
                −10s
              </>
            ) : (
              <>
                +10s
                <SkipForward className="w-5 h-5" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Center play — above chrome so pause → click resumes */}
      {!playing && !ended && !buffering && !error && !showHelp && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <button
            type="button"
            data-controls
            className="pointer-events-auto w-[4.5rem] h-[4.5rem] md:w-20 md:h-20 rounded-full bg-white/95 hover:bg-white text-black flex items-center justify-center transition shadow-[0_8px_32px_rgba(0,0,0,0.45)] hover:scale-105 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setShowPauseInfo(false);
              togglePlay();
            }}
            aria-label="Continue playing"
          >
            <Play className="w-9 h-9 ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Ended screen */}
      {ended && !error && (
        <div
          data-controls
          className="absolute inset-0 z-[35] flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm px-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-white/50 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
            Finished
          </p>
          <h3 className="text-white text-2xl md:text-4xl font-bold mb-2 max-w-2xl">
            {title}
          </h3>
          {meta && <p className="text-white/50 mb-8">{meta}</p>}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={replay}
              className="inline-flex items-center gap-2 bg-brand hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              <RotateCcw className="w-5 h-5" />
              Watch Again
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-xl font-semibold transition border border-white/10"
              >
                <Home className="w-5 h-5" />
                Back to Home
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pause info — tap anywhere to continue */}
      {showPauseInfo && infoOverlay && !ended && !error && !playing && (
        <div
          data-controls
          className="absolute inset-0 bg-black/80 flex items-center justify-center z-[45]"
          onClick={(e) => {
            e.stopPropagation();
            setShowPauseInfo(false);
            togglePlay();
          }}
        >
          <div className="pointer-events-none">{infoOverlay}</div>
          <p className="absolute bottom-24 text-white/40 text-sm">
            Tap to continue
          </p>
        </div>
      )}

      {/* Chrome */}
      {!error && (
        <div
          data-controls
          className={`absolute inset-0 z-30 flex flex-col justify-between pointer-events-none transition-opacity duration-300 ${
            showChrome && !ended ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className={`ff-player-top px-3 md:px-5 pt-3 pb-16 flex items-start gap-3 ${
              showChrome && !ended ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            {onBack && (
              <button
                type="button"
                className="ff-icon-btn shrink-0 mt-0.5"
                onClick={onBack}
                aria-label="Back"
              >
                <X className="w-5 h-5 md:hidden" />
                <span className="hidden md:inline-flex items-center gap-2 text-sm font-medium">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Back
                </span>
              </button>
            )}
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-white font-semibold text-base md:text-lg truncate drop-shadow">
                {title}
              </p>
              {meta && (
                <p className="text-white/65 text-xs md:text-sm truncate mt-0.5">
                  {meta}
                </p>
              )}
            </div>
          </div>

          <div
            className={`ff-player-bottom px-3 md:px-5 pb-3 md:pb-4 pt-20 ${
              showChrome && !ended ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            <SeekBar
              currentTime={currentTime}
              duration={duration}
              bufferRanges={bufferRanges}
              videoSrc={src}
              poster={poster}
              onSeek={(time) => {
                setShowPauseInfo(false);
                setCurrentTime(time);
                setVideoTime(time);
              }}
              onSeekingChange={setSeeking}
              onInteract={revealControls}
            />

            <div className="flex items-center gap-0.5 md:gap-1 text-white">
              <button
                type="button"
                className="ff-icon-btn"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="w-6 h-6" fill="currentColor" />
                ) : (
                  <Play className="w-6 h-6" fill="currentColor" />
                )}
              </button>

              <button
                type="button"
                className="ff-icon-btn"
                onClick={() => seekBy(-10)}
                aria-label="Back 10 seconds"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="ff-icon-btn"
                onClick={() => seekBy(10)}
                aria-label="Forward 10 seconds"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <VolumeSlider
                volume={volume}
                muted={muted}
                onChange={changeVolume}
                onToggleMute={toggleMute}
              />

              <span className="text-[11px] md:text-sm tabular-nums text-white/90 ml-0.5 whitespace-nowrap">
                {formatTime(currentTime)}
                <span className="text-white/45"> / {formatTime(duration)}</span>
              </span>

              <div className="flex-1" />

              <button
                type="button"
                className={`ff-icon-btn hidden sm:flex ${showHelp ? "text-brand" : ""}`}
                onClick={() => setShowHelp(true)}
                aria-label="Keyboard shortcuts"
                title="Shortcuts (?)"
              >
                <span className="text-sm font-bold w-5 text-center">?</span>
              </button>

              {/* Settings */}
              <div className="relative">
                <button
                  type="button"
                  data-settings-btn
                  className={`ff-icon-btn ${settingsTab ? "text-brand" : ""}`}
                  onClick={() =>
                    setSettingsTab((tab) => (tab ? null : "speed"))
                  }
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {settingsTab && (
                  <div
                    data-settings-panel
                    className="absolute bottom-full right-0 mb-2 w-60 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden"
                  >
                    <div className="flex border-b border-white/10">
                      <button
                        type="button"
                        className={`flex-1 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                          settingsTab === "speed"
                            ? "text-brand bg-white/5"
                            : "text-white/50 hover:text-white"
                        }`}
                        onClick={() => setSettingsTab("speed")}
                      >
                        Speed
                      </button>
                      <button
                        type="button"
                        className={`flex-1 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                          settingsTab === "captions"
                            ? "text-brand bg-white/5"
                            : "text-white/50 hover:text-white"
                        }`}
                        onClick={() => setSettingsTab("captions")}
                      >
                        Captions
                      </button>
                      <button
                        type="button"
                        className={`flex-1 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                          settingsTab === "general"
                            ? "text-brand bg-white/5"
                            : "text-white/50 hover:text-white"
                        }`}
                        onClick={() => setSettingsTab("general")}
                      >
                        General
                      </button>
                    </div>
                    {settingsTab === "speed" && (
                      <div className="py-1.5 max-h-56 overflow-y-auto">
                        {SPEEDS.map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            className={`w-full text-left px-4 py-2 text-sm transition hover:bg-white/10 ${
                              playbackRate === rate
                                ? "text-brand font-semibold"
                                : "text-white/90"
                            }`}
                            onClick={() => setSpeed(rate)}
                          >
                            {rate === 1 ? "Normal" : `${rate}x`}
                          </button>
                        ))}
                      </div>
                    )}
                    {settingsTab === "captions" && (
                      <div className="py-1.5">
                        {subtitleUrl ? (
                          <>
                            <button
                              type="button"
                              className={`w-full text-left px-4 py-2 text-sm transition hover:bg-white/10 ${
                                !subtitlesOn
                                  ? "text-brand font-semibold"
                                  : "text-white/90"
                              }`}
                              onClick={() => setSubtitlesOn(false)}
                            >
                              Off
                            </button>
                            <button
                              type="button"
                              className={`w-full text-left px-4 py-2 text-sm transition hover:bg-white/10 ${
                                subtitlesOn
                                  ? "text-brand font-semibold"
                                  : "text-white/90"
                              }`}
                              onClick={() => setSubtitlesOn(true)}
                            >
                              Indonesian
                            </button>
                          </>
                        ) : (
                          <p className="px-4 py-3 text-sm text-white/45">
                            No captions available
                          </p>
                        )}
                      </div>
                    )}
                    {settingsTab === "general" && (
                      <div className="py-2 px-4 space-y-3">
                        <label className="flex items-center justify-between gap-3 text-sm text-white/90 cursor-pointer">
                          <span>Pause info overlay</span>
                          <input
                            type="checkbox"
                            className="accent-brand w-4 h-4"
                            checked={pauseInfoEnabled}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setPauseInfoEnabled(enabled);
                              patchPlayerPrefs({ pauseInfoEnabled: enabled });
                              if (!enabled) setShowPauseInfo(false);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="w-full text-left text-sm text-white/70 hover:text-white transition py-1"
                          onClick={() => {
                            setSettingsTab(null);
                            setShowHelp(true);
                          }}
                        >
                          Keyboard shortcuts (?)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {subtitleUrl && (
                <button
                  type="button"
                  className={`ff-icon-btn ${subtitlesOn ? "text-brand" : ""}`}
                  onClick={toggleSubtitles}
                  aria-label={
                    subtitlesOn ? "Disable subtitles" : "Enable subtitles"
                  }
                  title="Subtitles (C)"
                >
                  {subtitlesOn ? (
                    <Captions className="w-5 h-5" />
                  ) : (
                    <CaptionsOff className="w-5 h-5" />
                  )}
                </button>
              )}

              {pipSupported && (
                <button
                  type="button"
                  className={`ff-icon-btn hidden sm:flex ${
                    inPip ? "text-brand" : ""
                  }`}
                  onClick={() => void togglePip()}
                  aria-label="Picture in picture"
                  title="PiP (P)"
                >
                  <PictureInPicture2 className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                className="ff-icon-btn"
                onClick={() => void toggleFullscreen()}
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                title="Fullscreen (F)"
              >
                {fullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
