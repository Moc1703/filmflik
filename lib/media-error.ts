/** Map HTMLMediaElement error codes to user-facing messages. */
export function getMediaErrorMessage(video: HTMLVideoElement | null): string {
  const err = video?.error;
  if (!err) {
    return "This video could not be loaded. Check your connection or try again.";
  }

  switch (err.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Playback was aborted. Tap Retry to start again.";
    case MediaError.MEDIA_ERR_NETWORK:
      return "Network error while loading the video. Check your connection, then Retry.";
    case MediaError.MEDIA_ERR_DECODE:
      return "This video file could not be decoded. The format may be unsupported.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "Video source not found or not supported (404 / wrong URL / CORS).";
    default:
      return err.message?.trim() ||
        "This video could not be loaded. Check your connection or try again.";
  }
}
