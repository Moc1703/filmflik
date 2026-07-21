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
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/88 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md bg-surface border border-line overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="ff-display text-foreground font-semibold text-lg tracking-tight">
            Keyboard shortcuts
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground text-sm px-2 py-1 hover:bg-foreground/5 transition-colors"
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
              <span className="text-muted">{row.action}</span>
              <kbd className="shrink-0 bg-foreground/5 border border-line px-2 py-1 text-foreground font-medium tabular-nums text-xs">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
