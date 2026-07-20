const PROGRESS_PREFIX = "ff:progress:";
const PREFS_KEY = "ff:player-prefs";

export interface PlayerPrefs {
  volume: number;
  muted: boolean;
  pauseInfoEnabled: boolean;
}

export interface WatchProgress {
  time: number;
  duration: number;
  updatedAt: number;
}

export interface WatchProgressEntry {
  movieId: string;
  progress: WatchProgress;
}

const DEFAULT_PREFS: PlayerPrefs = {
  volume: 1,
  muted: false,
  pauseInfoEnabled: true,
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getPlayerPrefs(): PlayerPrefs {
  if (!canUseStorage()) return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;
    return {
      volume: Math.min(1, Math.max(0, Number(parsed.volume) || 1)),
      muted: Boolean(parsed.muted),
      pauseInfoEnabled:
        typeof parsed.pauseInfoEnabled === "boolean"
          ? parsed.pauseInfoEnabled
          : true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setPlayerPrefs(prefs: PlayerPrefs): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        volume: Math.min(1, Math.max(0, prefs.volume)),
        muted: prefs.muted,
        pauseInfoEnabled: prefs.pauseInfoEnabled,
      })
    );
  } catch {
    // quota / private mode
  }
}

export function patchPlayerPrefs(partial: Partial<PlayerPrefs>): PlayerPrefs {
  const next = { ...getPlayerPrefs(), ...partial };
  setPlayerPrefs(next);
  return next;
}

export function getWatchProgress(movieId: string): WatchProgress | null {
  if (!canUseStorage() || !movieId) return null;
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + movieId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WatchProgress;
    if (
      !Number.isFinite(parsed.time) ||
      !Number.isFinite(parsed.duration) ||
      parsed.time < 5
    ) {
      return null;
    }
    if (parsed.duration > 0 && parsed.time / parsed.duration > 0.95) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getAllWatchProgress(): WatchProgressEntry[] {
  if (!canUseStorage()) return [];
  const entries: WatchProgressEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PROGRESS_PREFIX)) continue;
      const movieId = key.slice(PROGRESS_PREFIX.length);
      const progress = getWatchProgress(movieId);
      if (progress) entries.push({ movieId, progress });
    }
  } catch {
    return [];
  }
  return entries.sort((a, b) => b.progress.updatedAt - a.progress.updatedAt);
}

export function saveWatchProgress(
  movieId: string,
  time: number,
  duration: number
): void {
  if (!canUseStorage() || !movieId) return;
  if (!Number.isFinite(time) || !Number.isFinite(duration)) return;
  if (time < 5) return;
  if (duration > 0 && time / duration > 0.95) {
    clearWatchProgress(movieId);
    return;
  }
  try {
    const payload: WatchProgress = {
      time,
      duration,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PROGRESS_PREFIX + movieId, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearWatchProgress(movieId: string): void {
  if (!canUseStorage() || !movieId) return;
  try {
    localStorage.removeItem(PROGRESS_PREFIX + movieId);
  } catch {
    // ignore
  }
}

export function formatProgressTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
