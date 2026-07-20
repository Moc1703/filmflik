"use client";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Space / K", action: "Play / Pause" },
  { keys: "J / ←", action: "Back 10 seconds" },
  { keys: "L / →", action: "Forward 10 seconds" },
  { keys: "↑ / ↓", action: "Volume up / down" },
  { keys: "M", action: "Mute / Unmute" },
  { keys: "F", action: "Fullscreen" },
  { keys: "C", action: "Toggle captions" },
  { keys: "P", action: "Picture in picture" },
  { keys: ", / .", action: "Slower / Faster" },
  { keys: "0–9", action: "Jump to 0%–90%" },
  { keys: "?", action: "Show / hide this help" },
  { keys: "Esc", action: "Close menus / exit help" },
];

interface KeyboardHelpProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardHelp({ open, onClose }: KeyboardHelpProps) {
  if (!open) return null;

  return (
    <div
      data-controls
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-zinc-900/95 border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-lg">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-white/10 transition"
          >
            Esc
          </button>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-2">
          {SHORTCUTS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm"
            >
              <span className="text-white/70">{row.action}</span>
              <kbd className="shrink-0 rounded-md bg-white/10 border border-white/10 px-2 py-1 text-white font-medium tabular-nums text-xs">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
