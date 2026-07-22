/**
 * Convert SRT (or already-VTT) text into WebVTT for <track>.
 */
export function toWebVtt(input: string): string {
  const text = input.replace(/^\uFEFF/, "").trim();
  if (!text) {
    throw new Error("Subtitle file is empty");
  }

  if (/^WEBVTT/i.test(text)) {
    return text.endsWith("\n") ? text : `${text}\n`;
  }

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\s*\n/);
  const cues: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    let idx = 0;
    if (/^\d+$/.test(lines[0]!)) idx = 1;
    const timing = lines[idx];
    if (!timing || !timing.includes("-->")) continue;

    const vttTiming = timing
      .replace(/,/g, ".")
      .replace(
        /(\d{1,2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})/,
        "$1 --> $2"
      );

    const body = lines.slice(idx + 1).join("\n");
    if (!body) continue;
    cues.push(`${vttTiming}\n${body}`);
  }

  if (cues.length === 0) {
    throw new Error("Could not parse subtitle cues (use .srt or .vtt)");
  }

  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}
