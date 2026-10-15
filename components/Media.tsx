// Small building blocks: posters, photo tiles and avatars.

import Link from "next/link";
import { AVATAR_COLORS, FILTERS, findTitle, slugify, type FilterName } from "@/lib/data";

export function Poster({ title, width, label = true }: { title: string; width?: number | string; label?: boolean }) {
  const t = findTitle(title);
  return (
    <Link
      href={`/title/${slugify(title)}`}
      className="poster"
      style={{ background: t.color, width }}
      aria-label={`Open ${title}`}
    >
      {label ? title : null}
    </Link>
  );
}

export function Shot({ src, filter }: { src: string; filter: FilterName }) {
  const isImage = src.startsWith("blob:") || src.startsWith("http") || src.startsWith("data:");
  return (
    <div
      className={`shot ${isImage ? "" : src}`}
      style={{
        backgroundImage: isImage ? `url("${src}")` : undefined,
        filter: FILTERS[filter],
      }}
    />
  );
}

export function Avatar({ user, size = 32 }: { user: string; size?: number }) {
  return (
    <div
      className="av"
      style={{ background: AVATAR_COLORS[user] ?? "#4A4A52", width: size, height: size }}
    >
      {user[0].toUpperCase()}
    </div>
  );
}
