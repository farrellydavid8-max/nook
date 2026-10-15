"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { CloseIcon, PlusIcon } from "@/components/Icons";
import { CURRENT_USER, FILTERS, TITLES, type FilterName } from "@/lib/data";
import { useStore } from "@/lib/store";

const isImage = (s: string) => s.startsWith("blob:");
const bg = (s: string) => (isImage(s) ? { backgroundImage: `url("${s}")` } : {});

export default function PhotoPostPage() {
  const router = useRouter();
  const { addPost, toast } = useStore();
  const [shots, setShots] = useState<string[]>(["s0", "s1", "s2"]);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<FilterName>("Dusk");
  const [strength, setStrength] = useState(70);
  const [title, setTitle] = useState("Elden Ring");
  const [caption, setCaption] = useState("Golden hour in Limgrave");

  const current = shots[selected];

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    // Preview only: the photos stay on this device until uploads are connected to storage
    const urls = Array.from(files)
      .slice(0, 6)
      .map((f) => URL.createObjectURL(f));
    setShots((s) => [...s, ...urls]);
    setSelected(shots.length + urls.length - 1);
    toast(`Added ${urls.length} ${urls.length > 1 ? "photos" : "photo"}`);
  }

  function post() {
    addPost({ type: "photo", user: CURRENT_USER, title, shots: shots.slice(0, 6), filter, caption: caption.trim() });
    toast("Posted to your feed");
    router.push("/");
  }

  return (
    <section className="screen" aria-label="New photo post">
      <header className="sheethead">
        <Link href="/" className="iconbtn" aria-label="Close">
          <CloseIcon />
        </Link>
        <h1>New photo post</h1>
        <button type="button" className="pill" onClick={post}>
          Post
        </button>
      </header>

      <div className="preview">
        <div className={`layer ${isImage(current) ? "" : current}`} style={bg(current)} />
        <div
          className={`layer ${isImage(current) ? "" : current}`}
          style={{ ...bg(current), filter: FILTERS[filter], opacity: strength / 100 }}
        />
        <div className="cap">
          Shot {selected + 1} of {shots.length} · {filter}
        </div>
      </div>

      <div className="thumbs">
        {shots.map((s, i) => (
          <button
            key={s + i}
            className={`thumb ${isImage(s) ? "" : s}`}
            style={bg(s)}
            aria-pressed={i === selected}
            aria-label={`Select shot ${i + 1}`}
            onClick={() => setSelected(i)}
          />
        ))}
        <label className="thumb add" aria-label="Upload your own screenshots">
          <PlusIcon size={20} />
          <input type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        </label>
      </div>

      <div className="field">
        Filter
        <div className="filters" role="group" aria-label="Filter">
          {(Object.keys(FILTERS) as FilterName[]).map((f) => (
            <button key={f} className="filt" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              <span className={isImage(current) ? "" : current} style={{ ...bg(current), filter: FILTERS[f] }} />
              {f}
            </button>
          ))}
        </div>
      </div>

      <label className="field" htmlFor="photo-strength">
        Strength
        <input id="photo-strength" type="range" min={0} max={100} value={strength} onChange={(e) => setStrength(+e.target.value)} />
      </label>

      <label className="field" htmlFor="photo-title">
        Tag a title
        <select id="photo-title" value={title} onChange={(e) => setTitle(e.target.value)}>
          {TITLES.map((t) => (
            <option key={t.name}>{t.name}</option>
          ))}
        </select>
      </label>

      <label className="field" htmlFor="photo-caption">
        Caption
        <input id="photo-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </label>
    </section>
  );
}
