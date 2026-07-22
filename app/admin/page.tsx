"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogEntry } from "@/lib/catalog";
import { DEFAULT_THUMBNAIL } from "@/lib/thumbnail";
import { CATEGORY_PRESETS } from "@/lib/categories";
import { ImagePlus, Loader2, LogOut, RefreshCw, Search, Trash2, X } from "lucide-react";
import PosterImage from "@/components/PosterImage";
import AdminStreamUpload from "@/components/AdminStreamUpload";

interface AdminBunnyItem {
  path: string;
  objectName: string;
  length: number;
  sizeLabel: string;
  lastChanged: string | null;
  released: boolean;
  entry: CatalogEntry | null;
  source?: "stream";
  suggested: {
    id: string;
    title: string;
    thumbnail?: string;
    duration?: string;
    streamVideoId: string;
  };
}

type Draft = CatalogEntry & { released: boolean };
type DraftMap = Record<string, Draft>;
type FilterTab = "all" | "released" | "draft";

function emptyDraft(item: AdminBunnyItem): Draft {
  const streamVideoId =
    item.entry?.streamVideoId ||
    item.suggested.streamVideoId ||
    (item.path.startsWith("stream:") ? item.path.slice("stream:".length) : "");

  return {
    id: item.entry?.id || item.suggested.id,
    streamVideoId,
    title: item.entry?.title || item.suggested.title,
    description:
      item.entry?.description || "A title from the FILMflik library.",
    thumbnail:
      item.entry?.thumbnail ||
      item.suggested.thumbnail ||
      DEFAULT_THUMBNAIL,
    duration: item.entry?.duration || item.suggested.duration || "—",
    genre: item.entry?.genre || "Featured",
    year: item.entry?.year || new Date().getFullYear(),
    subtitleUrl: item.entry?.subtitleUrl,
    released: item.released,
    addedAt: item.entry?.addedAt,
  };
}

function draftSignature(d: Draft): string {
  return JSON.stringify({
    released: Boolean(d.released),
    id: d.id,
    title: d.title,
    description: d.description,
    thumbnail: d.thumbnail,
    duration: d.duration,
    genre: d.genre,
    year: d.year,
    subtitleUrl: d.subtitleUrl || "",
    streamVideoId: d.streamVideoId || "",
  });
}

/** Build a catalog row from draft + Stream hints. */
function toCatalogPayload(
  path: string,
  d: Draft,
  file?: AdminBunnyItem
): CatalogEntry | null {
  const streamVideoId =
    d.streamVideoId ||
    file?.suggested.streamVideoId ||
    file?.entry?.streamVideoId ||
    (path.startsWith("stream:") ? path.slice("stream:".length) : "");
  if (!streamVideoId.trim()) return null;

  return {
    id: d.id || file?.suggested.id || path,
    title: d.title,
    description: d.description,
    thumbnail: d.thumbnail,
    duration: d.duration,
    genre: d.genre,
    year: d.year,
    subtitleUrl: d.subtitleUrl,
    streamVideoId: streamVideoId.trim(),
    released: Boolean(d.released),
    addedAt: d.addedAt ?? file?.entry?.addedAt,
  };
}

const fieldClass =
  "mt-1.5 w-full bg-surface border border-line px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand/60";

export default function AdminPage() {
  const [files, setFiles] = useState<AdminBunnyItem[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [baseline, setBaseline] = useState<DraftMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [removing, setRemoving] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef<DraftMap>({});
  const baselineRef = useRef<DraftMap>({});
  const catalogPathsRef = useRef<Set<string>>(new Set());
  const filesRef = useRef<AdminBunnyItem[]>([]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const load = useCallback(async (opts?: { keepStatus?: boolean }) => {
    setLoading(true);
    setError(null);
    if (!opts?.keepStatus) setStatus(null);
    try {
      const res = await fetch("/api/admin/bunny", { cache: "no-store" });
      const data = (await res.json()) as {
        files?: AdminBunnyItem[];
        configured?: boolean;
        error?: string;
      };
      if (!res.ok && res.status !== 503) {
        throw new Error(data.error || "Failed to load Bunny files");
      }
      setConfigured(Boolean(data.configured));
      const list = data.files ?? [];
      setFiles(list);
      filesRef.current = list;
      const next: DraftMap = {};
      const inCatalog = new Set<string>();
      for (const item of list) {
        next[item.path] = emptyDraft(item);
        if (item.entry) inCatalog.add(item.path);
      }
      setDrafts(next);
      setBaseline(next);
      draftsRef.current = next;
      baselineRef.current = next;
      catalogPathsRef.current = inCatalog;
      setSelectedPath((prev) => (prev && next[prev] ? prev : null));
      if (data.error && res.status === 503) setError(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const releasedCount = useMemo(
    () => Object.values(drafts).filter((d) => d.released).length,
    [drafts]
  );

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const path of Object.keys(drafts)) {
      const a = drafts[path];
      const b = baseline[path];
      if (!a) continue;
      if (!b || draftSignature(a) !== draftSignature(b)) n += 1;
    }
    return n;
  }, [drafts, baseline]);

  const selectedDirty = Boolean(
    selectedPath &&
      drafts[selectedPath] &&
      baseline[selectedPath] &&
      draftSignature(drafts[selectedPath]) !==
        draftSignature(baseline[selectedPath])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((file) => {
      const draft = drafts[file.path];
      if (!draft) return false;
      if (filter === "released" && !draft.released) return false;
      if (filter === "draft" && draft.released) return false;
      if (!q) return true;
      return (
        file.objectName.toLowerCase().includes(q) ||
        file.path.toLowerCase().includes(q) ||
        draft.title.toLowerCase().includes(q) ||
        draft.genre.toLowerCase().includes(q)
      );
    });
  }, [files, drafts, query, filter]);

  const selected = selectedPath ? drafts[selectedPath] : null;
  const selectedFile = selectedPath
    ? files.find((f) => f.path === selectedPath)
    : null;

  const updateDraft = (path: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const current = prev[path];
      if (!current) return prev;
      const next = { ...prev, [path]: { ...current, ...patch } };
      draftsRef.current = next;
      return next;
    });
  };

  const uploadThumbnail = async (path: string, file: File) => {
    setUploadingThumb(true);
    setError(null);
    setStatus(null);
    try {
      const draft = draftsRef.current[path];
      const body = new FormData();
      body.set("file", file);
      body.set("movieId", draft?.id || path);
      const res = await fetch("/api/admin/thumbnail", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }
      updateDraft(path, { thumbnail: data.url });
      setStatus("Thumbnail uploaded — click Save to publish");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingThumb(false);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  const setReleasedBulk = (paths: string[], released: boolean) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const path of paths) {
        if (next[path]) next[path] = { ...next[path], released };
      }
      draftsRef.current = next;
      return next;
    });
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const removeFromCatalog = async (path: string) => {
    const draft = draftsRef.current[path];
    const file = filesRef.current.find((f) => f.path === path);
    if (!file?.entry) return;

    const label = draft?.title || file.entry.title || "this title";
    const ok = window.confirm(
      `Remove “${label}” from the catalog?\n\nThe Bunny video stays — only the FilmFlik listing (draft or live) is deleted.`
    );
    if (!ok) return;

    setRemoving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/catalog/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft?.id || file?.entry?.id,
          path,
          streamVideoId: draft?.streamVideoId || file?.entry?.streamVideoId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Remove failed");
      }
      setSelectedPath(null);
      setStatus(`Removed “${label}” from catalog`);
      await load({ keepStatus: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setRemoving(false);
    }
  };

  const save = async (opts?: { closeDrawer?: boolean }) => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const currentDrafts = draftsRef.current;
      const baselineMap = baselineRef.current;
      const inCatalog = catalogPathsRef.current;
      const fileByPath = new Map(
        filesRef.current.map((f) => [f.path, f] as const)
      );

      const movies: CatalogEntry[] = Object.entries(currentDrafts)
        .filter(([path, d]) => {
          if (d.released) return true;
          const b = baselineMap[path];
          const dirty = !b || draftSignature(d) !== draftSignature(b);
          return dirty || inCatalog.has(path);
        })
        .map(([path, d]) => toCatalogPayload(path, d, fileByPath.get(path)))
        .filter((m): m is CatalogEntry => m !== null);

      if (movies.length === 0) {
        throw new Error("Nothing to save — titles need a Stream video id.");
      }

      const missingSource = movies.filter((m) => !m.streamVideoId.trim());
      if (missingSource.length > 0) {
        throw new Error(
          `Cannot save “${missingSource[0]?.title || "title"}” — missing Stream video. Refresh and try again.`
        );
      }

      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movies }),
      });
      const data = (await res.json()) as {
        error?: string;
        releasedCount?: number;
        draftCount?: number;
        rejected?: { title?: string; reason: string }[];
      };
      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }
      if (data.rejected && data.rejected.length > 0) {
        setError(
          `Some rows were skipped: ${data.rejected
            .map((r) => r.title)
            .join(", ")}`
        );
      }
      const releasedN =
        typeof data.releasedCount === "number"
          ? data.releasedCount
          : movies.filter((m) => m.released !== false).length;
      const draftN =
        typeof data.draftCount === "number"
          ? data.draftCount
          : movies.length - releasedN;
      setStatus(
        `Saved ${releasedN} live` +
          (draftN > 0 ? ` · ${draftN} draft${draftN === 1 ? "" : "s"}` : "")
      );
      if (opts?.closeDrawer) setSelectedPath(null);
      await load({ keepStatus: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "released", label: "Released" },
    { id: "draft", label: "Not released" },
  ];

  return (
    <main className="ff-atmosphere min-h-screen pb-24">
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8 py-8 md:py-10">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div>
            <p className="ff-display text-sm font-extrabold tracking-tight text-foreground mb-2">
              FILM<span className="text-brand">flik</span>
            </p>
            <h1 className="ff-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Release panel
            </h1>
            <p className="text-muted text-sm mt-2">
              {files.length} in Stream · {releasedCount} released
              {dirtyCount > 0 ? ` · ${dirtyCount} unsaved` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              View site
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="ff-icon-btn border border-line"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="ff-icon-btn border border-line"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {error && (
          <p className="text-[#e07a6a] text-sm mb-4 border border-[#e07a6a]/30 bg-[#e07a6a]/10 px-4 py-3">
            {error}
          </p>
        )}
        {status && (
          <p className="text-brand text-sm mb-4 border border-brand/30 bg-brand/10 px-4 py-3">
            {status}
          </p>
        )}

        {!configured && !loading && (
          <div className="border border-line px-5 py-8 text-sm text-muted leading-relaxed mb-6">
            <p className="text-foreground font-medium mb-2">
              Stream env missing
            </p>
            <p>
              Configure Bunny Stream (<code className="text-foreground/80">BUNNY_STREAM_*</code>)
              in <code className="text-foreground/80">.env.local</code>, then restart.
              Storage is still used for catalog.json and thumbnails.
            </p>
          </div>
        )}

        {configured && (
          <AdminStreamUpload
            disabled={loading || saving}
            onUploaded={({ videoId, title }) => {
              setStatus(
                `Uploaded “${title}” to Stream. Encoding may take a minute — refresh if it doesn’t appear yet.`
              );
              void (async () => {
                await load({ keepStatus: true });
                setSelectedPath(`stream:${videoId}`);
              })();
            }}
          />
        )}

        {configured && (
          <div className="flex flex-col gap-4 mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search filename, title, genre…"
                className="w-full bg-surface border border-line pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-brand/60"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 border border-line p-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === tab.id
                        ? "bg-brand text-[#1a1208]"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  disabled={filtered.length === 0}
                  onClick={() =>
                    setReleasedBulk(
                      filtered.map((f) => f.path),
                      true
                    )
                  }
                  className="text-muted hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  Release shown
                </button>
                <span className="text-line">·</span>
                <button
                  type="button"
                  disabled={filtered.length === 0}
                  onClick={() =>
                    setReleasedBulk(
                      filtered.map((f) => f.path),
                      false
                    )
                  }
                  className="text-muted hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  Unrelease shown
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-muted text-sm py-16">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            Loading Bunny files…
          </div>
        ) : (
          <div className="border-t border-line max-w-3xl">
            {filtered.length === 0 ? (
              <p className="py-12 text-muted text-sm">
                {files.length === 0
                  ? "No videos found in Bunny Stream."
                  : "No files match this filter."}
              </p>
            ) : (
              <ul>
                {filtered.map((file) => {
                  const draft = drafts[file.path];
                  if (!draft) return null;
                  const filePath = file.path;
                  const active = selectedPath === filePath;
                  const dirty =
                    baseline[filePath] &&
                    draftSignature(draft) !==
                      draftSignature(baseline[filePath]);
                  return (
                    <li key={filePath} className="border-b border-line">
                      <div
                        className={`flex items-center gap-3 py-3 px-2 -mx-2 transition-colors ${
                          active
                            ? "bg-foreground/[0.04]"
                            : "hover:bg-foreground/[0.03]"
                        }`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setSelectedPath(filePath)}
                        >
                          <div className="flex items-center gap-2">
                            <p className="ff-display text-foreground text-sm font-semibold tracking-tight truncate">
                              {draft.title}
                            </p>
                            {draft.released ? (
                              <span className="shrink-0 text-[10px] uppercase tracking-wider text-brand">
                                Live
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
                                Draft
                              </span>
                            )}
                            {file.source === "stream" && (
                              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
                                ABR
                              </span>
                            )}
                            {dirty && (
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand" />
                            )}
                          </div>
                          <p className="text-muted text-xs mt-0.5 truncate tabular-nums">
                            {file.sizeLabel}
                            {file.objectName !== draft.title && (
                              <>
                                <span className="mx-1.5 opacity-40">·</span>
                                {file.objectName}
                              </>
                            )}
                          </p>
                        </button>
                        <label
                          className="shrink-0 inline-flex items-center gap-2 text-xs text-muted cursor-pointer select-none px-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="accent-brand w-4 h-4"
                            checked={draft.released}
                            onChange={(e) => {
                              const released = e.target.checked;
                              const file = filesRef.current.find(
                                (f) => f.path === filePath
                              );
                              // Keep source ids attached when flipping Release
                              updateDraft(filePath, {
                                released,
                                streamVideoId:
                                  draft.streamVideoId ||
                                  file?.suggested.streamVideoId ||
                                  file?.entry?.streamVideoId ||
                                  (filePath.startsWith("stream:")
                                    ? filePath.slice("stream:".length)
                                    : draft.streamVideoId),
                              });
                            }}
                          />
                          <span className="hidden sm:inline">Release</span>
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-muted text-xs mt-3">
              Showing {filtered.length} of {files.length}
              <span className="mx-1.5 opacity-40">·</span>
              Click a row to edit
            </p>
          </div>
        )}
      </div>

      {selected && selectedFile && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            aria-label="Close editor"
            onClick={() => setSelectedPath(null)}
          />
          <aside
            className="relative z-10 h-full w-full max-w-md border-l border-line bg-background overflow-y-auto p-5 md:p-6 ff-rise"
            role="dialog"
            aria-modal="true"
            aria-label="Edit title"
          >
            <div className="space-y-4 pb-24">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted mb-2">
                    Edit
                  </p>
                  <p className="ff-display text-foreground font-semibold tracking-tight truncate">
                    {selected.title}
                  </p>
                  <p className="text-muted text-xs mt-1 break-all">
                    {selectedFile.objectName}
                    <span className="mx-1.5 opacity-40">·</span>
                    {selectedFile.path}
                  </p>
                </div>
                <button
                  type="button"
                  className="ff-icon-btn shrink-0 border border-line"
                  onClick={() => setSelectedPath(null)}
                  aria-label="Close editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!selected.released && (
                <p className="text-xs text-muted border border-line px-3 py-2">
                  Draft — Save keeps title, thumbnail, and description. Toggle
                  Release on the list when you want it on the public site.
                </p>
              )}

              <label className="block text-xs text-muted">
                Title
                <input
                  value={selected.title}
                  onChange={(e) =>
                    updateDraft(selectedPath!, { title: e.target.value })
                  }
                  className={fieldClass}
                  autoFocus
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-muted">
                  Category
                  <input
                    list="ff-category-presets"
                    value={selected.genre}
                    onChange={(e) =>
                      updateDraft(selectedPath!, { genre: e.target.value })
                    }
                    className={fieldClass}
                    placeholder="e.g. Drama, Music…"
                  />
                  <datalist id="ff-category-presets">
                    {CATEGORY_PRESETS.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>
                <label className="block text-xs text-muted">
                  Year
                  <input
                    type="number"
                    value={selected.year}
                    onChange={(e) =>
                      updateDraft(selectedPath!, {
                        year: Number(e.target.value) || selected.year,
                      })
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted">Thumbnail</p>
                <div className="relative aspect-video overflow-hidden bg-surface border border-line">
                  <PosterImage
                    src={selected.thumbnail}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && selectedPath) {
                        void uploadThumbnail(selectedPath, file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingThumb || !configured}
                    onClick={() => thumbInputRef.current?.click()}
                    className="inline-flex items-center gap-2 border border-line bg-foreground/5 hover:bg-foreground/10 disabled:opacity-40 text-foreground px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    {uploadingThumb ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3.5 h-3.5" />
                    )}
                    {uploadingThumb ? "Uploading…" : "Upload image"}
                  </button>
                  <button
                    type="button"
                    disabled={uploadingThumb}
                    onClick={() =>
                      updateDraft(selectedPath!, {
                        thumbnail: DEFAULT_THUMBNAIL,
                      })
                    }
                    className="border border-line bg-foreground/5 hover:bg-foreground/10 disabled:opacity-40 text-muted px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    Use default
                  </button>
                </div>
                <label className="block text-xs text-muted">
                  Or paste URL
                  <input
                    value={selected.thumbnail}
                    onChange={(e) =>
                      updateDraft(selectedPath!, {
                        thumbnail: e.target.value,
                      })
                    }
                    className={fieldClass}
                    placeholder="https://… or /api/thumbnails/…"
                  />
                </label>
              </div>
              <label className="block text-xs text-muted">
                Description
                <textarea
                  value={selected.description}
                  rows={4}
                  onChange={(e) =>
                    updateDraft(selectedPath!, {
                      description: e.target.value,
                    })
                  }
                  className={`${fieldClass} resize-y`}
                />
              </label>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving || !selectedDirty}
                  onClick={() => void save({ closeDrawer: true })}
                  className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-[#efb56f] disabled:opacity-40 text-[#1a1208] py-2.5 text-sm font-semibold transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save & close
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPath(null)}
                  className="w-full border border-line bg-foreground/5 hover:bg-foreground/10 text-foreground py-2.5 text-sm font-semibold transition-colors"
                >
                  Close without saving
                </button>
                {selectedFile?.entry ? (
                  <button
                    type="button"
                    disabled={removing || saving}
                    onClick={() =>
                      selectedPath && void removeFromCatalog(selectedPath)
                    }
                    className="w-full inline-flex items-center justify-center gap-2 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-300 py-2.5 text-sm font-semibold transition-colors"
                  >
                    {removing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Remove from catalog
                  </button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-muted truncate">
            {dirtyCount > 0
              ? `${dirtyCount} change${dirtyCount === 1 ? "" : "s"} unsaved — click Save to publish`
              : "All changes saved"}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading || !configured || dirtyCount === 0}
            className="inline-flex items-center gap-2 bg-brand hover:bg-[#efb56f] disabled:opacity-40 text-[#1a1208] px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save catalog · {releasedCount}
          </button>
        </div>
      </div>
    </main>
  );
}
