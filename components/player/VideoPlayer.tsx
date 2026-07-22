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
import { saveServerProgress } from "@/lib/progress-sync";
import {
  applyAutoLevelCap,
  getPreviewAbrHint,
} from "@/lib/network-quality";
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
  /** Shown on the finished screen — e.g. more titles to watch. */
  endRecommendations?: ReactNode;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type SettingsTab = "quality" | "speed" | "captions" | "general" | null;

type QualityOption = {
  /** hls.js level index, or -1 for Auto */
  level: number;
  label: string;
  height: number;
};

function qualityLabel(height: number, bitrate?: number): string {
  if (height > 0) return `${height}p`;
  if (bitrate && bitrate > 0) return `${Math.round(bitrate / 1000)} kbps`;
  return "Unknown";
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
  endRecommendations,
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
  const hlsRef = useRef<import("hls.js").default | null>(null);

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
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [qualityLevel, setQualityLevel] = useState(-1);
  const [activeHeight, setActiveHeight] = useState(0);

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
        void saveServerProgress(movieId, time, dur);
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

  const selectQuality = useCallback((level: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = level;
    setQualityLevel(level);
    const height =
      level < 0 ? -1 : hls.levels[level]?.height || -1;
    patchPlayerPrefs({ qualityHeight: height });
    revealControls();
  }, [revealControls]);

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

  // Apply prefs + media source (MP4 or HLS) when video mounts / retries
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const prefs = getPlayerPrefs();
    video.volume = prefs.volume;
    video.muted = prefs.muted;
    setError(null);

    let cancelled = false;
    const isHls = /\.m3u8($|\?)/i.test(src);

    const startPlayback = () => {
      if (cancelled) return;
      void video.play().catch(() => setShowControls(true));
    };

    const destroyHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    destroyHls();
    setQualities([]);
    setQualityLevel(-1);
    setActiveHeight(0);

    if (!isHls) {
      video.src = src;
      startPlayback();
      return () => {
        cancelled = true;
        destroyHls();
      };
    }

    void (async () => {
      const Hls = (await import("hls.js")).default;
      if (cancelled || !videoRef.current) return;

      if (Hls.isSupported()) {
        const preferredHeight = getPlayerPrefs().qualityHeight;
        const hint = getPreviewAbrHint();
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          // Prefer smoother playback over aggressive low-latency
          maxBufferLength: 40,
          maxMaxBufferLength: 80,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          // Auto: start low for fast first frame, then ABR climbs with network
          startLevel: preferredHeight > 0 ? -1 : hint.startLevel,
          abrEwmaDefaultEstimate:
            preferredHeight > 0 ? 1_500_000 : hint.abrEwmaDefaultEstimate,
          abrBandWidthFactor: 0.9,
          abrBandWidthUpFactor: 0.7,
          progressive: true,
        });
        hlsRef.current = hls;

        const syncLevels = () => {
          const levels = hls.levels
            .map((level, index) => ({
              level: index,
              height: level.height || 0,
              label: qualityLabel(level.height || 0, level.bitrate),
            }))
            .sort((a, b) => b.height - a.height);
          setQualities(levels);

          if (preferredHeight > 0) {
            const match = levels.find((l) => l.height === preferredHeight);
            const fallback =
              match ||
              levels.find((l) => l.height <= preferredHeight) ||
              levels[levels.length - 1];
            if (fallback) {
              hls.currentLevel = fallback.level;
              setQualityLevel(fallback.level);
              setActiveHeight(fallback.height);
              return;
            }
          }

          const cap = applyAutoLevelCap(
            hls.levels.map((l) => ({ height: l.height || 0 })),
            hint.maxHeight
          );
          if (cap >= 0) hls.autoLevelCapping = cap;
          hls.currentLevel = -1;
          setQualityLevel(-1);
        };

        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          syncLevels();
          startPlayback();
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          const height = hls.levels[data.level]?.height || 0;
          setActiveHeight(height);
          if (hls.autoLevelEnabled) {
            setQualityLevel(-1);
          } else {
            setQualityLevel(data.level);
          }
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }
          setError("Adaptive stream failed to load");
          setShowControls(true);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        startPlayback();
      } else {
        setError("HLS playback is not supported in this browser");
        setShowControls(true);
      }
    })();

    return () => {
      cancelled = true;
      destroyHls();
    };
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
        void saveServerProgress(movieId, video.currentTime, video.duration || 0);
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
        void saveServerProgress(movieId, video.currentTime, video.duration || 0);
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
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/92 px-6 text-center backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertCircle className="w-10 h-10 text-brand mb-4" />
          <h3 className="ff-display text-foreground text-xl md:text-2xl font-semibold mb-2 tracking-tight">
            Playback error
          </h3>
          <p className="text-muted max-w-md mb-8 text-sm md:text-base">
            {error}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={retryLoad}
              className="inline-flex items-center gap-2 bg-brand hover:bg-[#efb56f] text-[#1a1208] px-5 py-2.5 font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 border border-line bg-foreground/5 hover:bg-foreground/10 text-foreground px-5 py-2.5 font-semibold transition-colors"
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
            className={`flex items-center gap-2 bg-background/70 backdrop-blur-md border border-line px-4 py-2.5 text-foreground text-sm font-medium ${
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
            className="pointer-events-auto w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] bg-brand hover:bg-[#efb56f] text-[#1a1208] flex items-center justify-center transition-colors active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              setShowPauseInfo(false);
              togglePlay();
            }}
            aria-label="Continue playing"
          >
            <Play className="w-8 h-8 ml-0.5" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Ended screen */}
      {ended && !error && (
        <div
          data-controls
          className="absolute inset-0 z-[35] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm px-5 md:px-10 overflow-y-auto py-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-4xl text-center">
            <p className="text-brand text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              Finished
            </p>
            <h3 className="ff-display text-foreground text-2xl md:text-4xl font-semibold mb-2 tracking-tight">
              {title}
            </h3>
            {meta && <p className="text-muted mb-6 text-sm">{meta}</p>}
            <div className="flex flex-wrap gap-3 justify-center mb-10">
              <button
                type="button"
                onClick={replay}
                className="inline-flex items-center gap-2 bg-brand hover:bg-[#efb56f] text-[#1a1208] px-6 py-3 font-semibold transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Watch again
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 border border-line bg-foreground/5 hover:bg-foreground/10 text-foreground px-6 py-3 font-semibold transition-colors"
                >
                  <Home className="w-5 h-5" />
                  Back to Home
                </button>
              )}
            </div>

            {endRecommendations}
          </div>
        </div>
      )}

      {/* Pause info — tap anywhere to continue */}
      {showPauseInfo && infoOverlay && !ended && !error && !playing && (
        <div
          data-controls
          className="absolute inset-0 bg-background/88 flex items-center justify-center z-[45] backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowPauseInfo(false);
            togglePlay();
          }}
        >
          <div className="pointer-events-none w-full max-w-7xl px-5 md:px-12 lg:px-16">
            {infoOverlay}
          </div>
          <p className="absolute bottom-24 text-muted text-sm">
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
              <p className="ff-display text-foreground font-semibold text-base md:text-lg truncate">
                {title}
              </p>
              {meta && (
                <p className="text-muted text-xs md:text-sm truncate mt-0.5">
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

              <span className="text-[11px] md:text-sm tabular-nums text-foreground/90 ml-0.5 whitespace-nowrap">
                {formatTime(currentTime)}
                <span className="text-muted"> / {formatTime(duration)}</span>
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
                    setSettingsTab((tab) =>
                      tab ? null : qualities.length > 0 ? "quality" : "speed"
                    )
                  }
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {settingsTab && (
                  <div
                    data-settings-panel
                    className="absolute bottom-full right-0 mb-2 w-64 bg-surface/95 backdrop-blur-md border border-line overflow-hidden"
                  >
                    <div className="flex border-b border-line">
                      {qualities.length > 0 && (
                        <button
                          type="button"
                          className={`flex-1 px-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                            settingsTab === "quality"
                              ? "text-brand bg-foreground/5"
                              : "text-muted hover:text-foreground"
                          }`}
                          onClick={() => setSettingsTab("quality")}
                        >
                          Quality
                        </button>
                      )}
                      <button
                        type="button"
                        className={`flex-1 px-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                          settingsTab === "speed"
                            ? "text-brand bg-foreground/5"
                            : "text-muted hover:text-foreground"
                        }`}
                        onClick={() => setSettingsTab("speed")}
                      >
                        Speed
                      </button>
                      <button
                        type="button"
                        className={`flex-1 px-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                          settingsTab === "captions"
                            ? "text-brand bg-foreground/5"
                            : "text-muted hover:text-foreground"
                        }`}
                        onClick={() => setSettingsTab("captions")}
                      >
                        Captions
                      </button>
                      <button
                        type="button"
                        className={`flex-1 px-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                          settingsTab === "general"
                            ? "text-brand bg-foreground/5"
                            : "text-muted hover:text-foreground"
                        }`}
                        onClick={() => setSettingsTab("general")}
                      >
                        General
                      </button>
                    </div>
                    {settingsTab === "quality" && qualities.length > 0 && (
                      <div className="py-1.5 max-h-56 overflow-y-auto">
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-2 text-sm transition hover:bg-foreground/5 ${
                            qualityLevel < 0
                              ? "text-brand font-semibold"
                              : "text-foreground/90"
                          }`}
                          onClick={() => selectQuality(-1)}
                        >
                          Auto
                          {qualityLevel < 0 && activeHeight > 0 ? (
                            <span className="ml-2 text-muted font-normal">
                              {qualityLabel(activeHeight)}
                            </span>
                          ) : null}
                        </button>
                        {qualities.map((q) => (
                          <button
                            key={q.level}
                            type="button"
                            className={`w-full text-left px-4 py-2 text-sm transition hover:bg-foreground/5 ${
                              qualityLevel === q.level
                                ? "text-brand font-semibold"
                                : "text-foreground/90"
                            }`}
                            onClick={() => selectQuality(q.level)}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {settingsTab === "speed" && (
                      <div className="py-1.5 max-h-56 overflow-y-auto">
                        {SPEEDS.map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            className={`w-full text-left px-4 py-2 text-sm transition hover:bg-foreground/5 ${
                              playbackRate === rate
                                ? "text-brand font-semibold"
                                : "text-foreground/90"
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
                              className={`w-full text-left px-4 py-2 text-sm transition hover:bg-foreground/5 ${
                                !subtitlesOn
                                  ? "text-brand font-semibold"
                                  : "text-foreground/90"
                              }`}
                              onClick={() => setSubtitlesOn(false)}
                            >
                              Off
                            </button>
                            <button
                              type="button"
                              className={`w-full text-left px-4 py-2 text-sm transition hover:bg-foreground/5 ${
                                subtitlesOn
                                  ? "text-brand font-semibold"
                                  : "text-foreground/90"
                              }`}
                              onClick={() => setSubtitlesOn(true)}
                            >
                              Indonesian
                            </button>
                          </>
                        ) : (
                          <p className="px-4 py-3 text-sm text-muted">
                            No captions available
                          </p>
                        )}
                      </div>
                    )}
                    {settingsTab === "general" && (
                      <div className="py-2 px-4 space-y-3">
                        <label className="flex items-center justify-between gap-3 text-sm text-foreground/90 cursor-pointer">
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
                          className="w-full text-left text-sm text-muted hover:text-foreground transition py-1"
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
