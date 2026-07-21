/** Lightweight network hints for preview / ABR start. */

export type AbrHint = {
  /** hls.js startLevel: 0 = lowest (fast first frame), -1 = auto */
  startLevel: number;
  /** Initial bandwidth guess (bits/s) — higher upgrades quality faster */
  abrEwmaDefaultEstimate: number;
  /** Soft cap on height for weak links (0 = no cap) */
  maxHeight: number;
};

type NetworkConnection = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
};

function getConnection(): NetworkConnection | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

/**
 * Always prefer a quick low start, then let ABR climb when the link allows.
 * Caps height on save-data / slow effectiveType.
 */
export function getPreviewAbrHint(): AbrHint {
  const conn = getConnection();
  if (conn?.saveData) {
    return {
      startLevel: 0,
      abrEwmaDefaultEstimate: 200_000,
      maxHeight: 360,
    };
  }

  const type = (conn?.effectiveType || "").toLowerCase();
  const downlink = typeof conn?.downlink === "number" ? conn.downlink : null;

  if (type === "slow-2g" || type === "2g") {
    return {
      startLevel: 0,
      abrEwmaDefaultEstimate: 150_000,
      maxHeight: 240,
    };
  }
  if (type === "3g" || (downlink !== null && downlink > 0 && downlink < 1.5)) {
    return {
      startLevel: 0,
      abrEwmaDefaultEstimate: 500_000,
      maxHeight: 480,
    };
  }
  if (type === "4g" || (downlink !== null && downlink >= 5)) {
    return {
      startLevel: 0,
      abrEwmaDefaultEstimate: 3_000_000,
      maxHeight: 0,
    };
  }

  // Unknown — start low, climb cautiously
  return {
    startLevel: 0,
    abrEwmaDefaultEstimate: 900_000,
    maxHeight: 720,
  };
}

/** Stream progressive MP4 ladder when HLS preview fails (Stream CDN assets only). */
export function getPreviewMp4Ladder(movieId: string): string[] {
  const hint = getPreviewAbrHint();
  const base = `/api/media/${encodeURIComponent(movieId)}`;
  if (hint.maxHeight > 0 && hint.maxHeight <= 240) {
    return [`${base}/play_240p.mp4`, `${base}/play_360p.mp4`];
  }
  if (hint.maxHeight > 0 && hint.maxHeight <= 360) {
    return [`${base}/play_360p.mp4`, `${base}/play_240p.mp4`, `${base}/play_480p.mp4`];
  }
  if (hint.maxHeight > 0 && hint.maxHeight <= 480) {
    return [`${base}/play_480p.mp4`, `${base}/play_360p.mp4`, `${base}/play_720p.mp4`];
  }
  return [
    `${base}/play_720p.mp4`,
    `${base}/play_480p.mp4`,
    `${base}/play_360p.mp4`,
    `${base}/play_240p.mp4`,
  ];
}

export function applyAutoLevelCap(
  levels: Array<{ height: number }>,
  maxHeight: number
): number {
  if (!maxHeight || levels.length === 0) return -1;
  let best = -1;
  for (let i = 0; i < levels.length; i++) {
    const h = levels[i]?.height || 0;
    if (h > 0 && h <= maxHeight) best = i;
  }
  return best;
}
