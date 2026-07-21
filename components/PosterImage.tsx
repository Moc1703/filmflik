"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { DEFAULT_THUMBNAIL, resolveThumbnail } from "@/lib/thumbnail";

type PosterImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt?: string;
};

export default function PosterImage({
  src,
  alt = "",
  onError,
  ...props
}: PosterImageProps) {
  const resolved = resolveThumbnail(src);
  const [current, setCurrent] = useState(resolved);

  useEffect(() => {
    setCurrent(resolveThumbnail(src));
  }, [src]);

  const isSvg = current.endsWith(".svg");

  return (
    <Image
      {...props}
      src={current}
      alt={alt}
      unoptimized={isSvg || props.unoptimized}
      onError={(event) => {
        if (current !== DEFAULT_THUMBNAIL) {
          setCurrent(DEFAULT_THUMBNAIL);
        }
        onError?.(event);
      }}
    />
  );
}
