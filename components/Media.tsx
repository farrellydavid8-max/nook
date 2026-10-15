// Small building blocks: posters, photo tiles and avatars.

import Link from "next/link";
import { FILTERS, findTitle, slugify, type FilterName } from "@/lib/data";

export function Poster({ title, width, label = true }: { title: string; width?: number | string; label?: boolean }) {
  const t = findTitle(title);
  return (
    <Link href={`/title/${slugify(title)}`} className="poster" style={{ background: t.color, width }} aria-label={`Open ${title}`}>
      {label ? title : null}
    </Link>
  );
}

// A photo with its filter. The filtered copy sits on top at the chosen strength.
export function Shot({ src, filter, strength = 100 }: { src: string; filter: FilterName; strength?: number }) {
  const image = { backgroundImage: `url("${src}")` };
  return (
    <div className="shot">
      <div className="layer" style={image} />
      <div className="layer" style={{ ...image, filter: FILTERS[filter], opacity: strength / 100 }} />
    </div>
  );
}

export function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <div className="av" style={{ background: color, width: size, height: size }} aria-hidden="true">
      {name[0]?.toUpperCase()}
    </div>
  );
}
