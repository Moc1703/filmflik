/** Local branded poster when a title has no (or broken) thumbnail. */
export const DEFAULT_THUMBNAIL = "/thumbnails/default.svg";

export function resolveThumbnail(src?: string | null): string {
  const value = typeof src === "string" ? src.trim() : "";
  return value || DEFAULT_THUMBNAIL;
}
