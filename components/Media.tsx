"use client";

// Small building blocks: posters, photo tiles and avatars.

import Link from "next/link";
import { useState } from "react";
import { FILTERS, colorFor, titleHref, type FilterName, type TitleRef } from "@/lib/data";

// Cover art when the catalog has it; otherwise a colored block with the name.
export function PosterArt({ title, label = true, className = "poster" }: { title: TitleRef; label?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = title.poster && !broken;
  return (
    <span className={className} style={{ background: colorFor(title.name) }}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={title.poster} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : label ? (
        title.name
      ) : null}
    </span>
  );
}

export function Poster({ title, width, label = true }: { title: TitleRef; width?: number | string; label?: boolean }) {
  return (
    <Link href={titleHref(title)} className="poster-link" style={{ width }} aria-label={`Open ${title.name}`}>
      <PosterArt title={title} label={label} />
    </Link>
  );
}

export const isVideo = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);

// A photo with its filter (the filtered copy sits on top at the chosen strength), or a clip.
export function Shot({ src, filter, strength = 100, controls = false }: { src: string; filter: FilterName; strength?: number; controls?: boolean }) {
  if (isVideo(src)) {
    return (
      <div className="shot">
        <video className="layer-video" src={src} controls={controls} muted playsInline preload="metadata" loop={!controls} />
        {!controls && <span className="play-badge" aria-label="Video">▶</span>}
      </div>
    );
  }
  const image = { backgroundImage: `url("${src}")` };
  return (
    <div className="shot">
      <div className="layer" style={image} />
      <div className="layer" style={{ ...image, filter: FILTERS[filter], opacity: strength / 100 }} />
    </div>
  );
}

export function Avatar({ name, color, url, size = 32 }: { name: string; color: string; url?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="av" style={{ background: color, width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden="true">
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        name[0]?.toUpperCase()
      )}
    </div>
  );
}
